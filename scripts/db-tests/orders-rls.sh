#!/usr/bin/env bash
# Disposable-database test for order RLS, the 0011 recursion fix and the 0010 order guards.
# Starts its own throwaway PostgreSQL (never touches any real database). Run as root or postgres user:
#   bash scripts/db-tests/orders-rls.sh
set -u
cd "$(dirname "$0")/../.."
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1); D=/var/tmp/pg_orders_rls; PORT=54331
rm -rf $D; mkdir -p $D; chown postgres $D
su postgres -c "$BIN/initdb -D $D/data -A trust >/dev/null && $BIN/pg_ctl -D $D/data -o '-p $PORT -k $D' -l $D/log start -w" >/dev/null 2>&1
trap 'su postgres -c "$BIN/pg_ctl -D $D/data stop -m fast" >/dev/null 2>&1; rm -rf $D' EXIT
PSQL="psql -h $D -p $PORT -U postgres -v ON_ERROR_STOP=1 -q -t -A"
$PSQL -c "create database t" ; PSQL="$PSQL -d t"
$PSQL >/dev/null <<'SQL'
create role anon; create role authenticated; create role service_role;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('app.uid',true),'')::uuid $$;
grant usage on schema auth to anon, authenticated;
create schema storage; create table storage.buckets(id text); create table storage.objects(bucket_id text,name text);
create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n,'/') $$;
SQL
apply(){ for f in "$@"; do $PSQL -f "$f" >/dev/null 2>$D/err || { echo "MIGRATION FAILED: $f"; cat $D/err; exit 2; }; done; }
PASS=0; FAIL=0
# as USER 'SQL' -> output of the last statement (or the error text)
# as: quiet, last output line (exact values). ast: full output incl. row-count tags and error text.
as(){ local u=$1; shift; local o; o=$($PSQL -c "set role authenticated; set app.uid='$u'; $*" 2>&1 | grep -vE '^(SET)$')
  if [[ "$o" == *ERROR* ]]; then echo "$o" | tr '\n' ' '; else echo "$o" | tail -1; fi; }
ast(){ local u=$1; shift; psql -h $D -p $PORT -U postgres -d t -t -A -c "set role authenticated; set app.uid='$u'; $*" 2>&1 | tr '\n' ' '; }
asanon(){ $PSQL -c "set role anon; $*" 2>&1 | tail -1; }
expect(){ local name=$1 want=$2 got=$3 mode=${4:-auto} ok=0
  if [[ "$mode" == auto ]]; then if [[ ${#want} -le 3 ]]; then mode=eq; else mode=has; fi; fi
  if [[ "$mode" == has && "$got" == *"$want"* ]]; then ok=1; fi
  if [[ "$mode" == eq && "$got" == "$want" ]]; then ok=1; fi
  if [[ $ok == 1 ]]; then PASS=$((PASS+1)); echo "PASS  $name"; else FAIL=$((FAIL+1)); echo "FAIL  $name  (wanted '$want', got '$got')"; fi; }

M=${MIGRATIONS_DIR:-drizzle/migrations}
apply $M/000{0,1,2,4,5,6,7,8,9}_*.sql
A=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa; B=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb; C=cccccccc-cccc-4ccc-8ccc-cccccccccccc
S1=51111111-1111-4111-8111-111111111111; S2=52222222-2222-4222-8222-222222222222
AD=ad000000-0000-4000-8000-000000000001; CRM=cc000000-0000-4000-8000-000000000002
$PSQL >/dev/null <<SQL
insert into profiles(id,full_name) values ('$A','A'),('$B','B'),('$C','C'),('$S1','S1'),('$S2','S2'),('$AD','Admin'),('$CRM','CRM');
insert into user_roles(user_id,role) values ('$AD','admin'),('$CRM','crm_staff'),('$S1','seller'),('$S2','seller');
insert into seller_profiles(user_id,store_name,approval_status) values ('$S1','S1','approved'),('$S2','S2','approved');
insert into categories(name,slug) values ('Other','other');
insert into products(id,seller_id,name,price,currency,country_of_origin,stock_quantity) values
 ('f1111111-1111-4111-8111-111111111111','$S1','P1',100,'AFN','Afghanistan',10),
 ('f2222222-2222-4222-8222-222222222222','$S2','P2',200,'INR','India',10);
SQL
P1=f1111111-1111-4111-8111-111111111111; P2=f2222222-2222-4222-8222-222222222222

echo "== BEFORE the fix (0009 only): recursion must reproduce"
$PSQL -c "insert into cart_items(user_id,product_id,quantity) values ('$A','$P1',1)" >/dev/null
OID0=$($PSQL -c "set app.uid='$A'; select place_order('A','+93 700 000 000','Afghanistan','Kabul','Street 1',null)" | tail -1)
expect "recursion reproduces without 0011 (customer reads orders)" "infinite recursion" "$(ast $A "select count(*) from orders")" has
$PSQL -c "delete from orders; update products set stock_quantity=10" >/dev/null

echo "== applying 0010 + 0011"
apply $M/0010_*.sql $M/0011_*.sql

echo "== checkout (as customers, through RLS)"
expect "customer can add to own cart" "INSERT 0 1" "$(ast $A "insert into cart_items(user_id,product_id,quantity) values ('$A','$P1',2)")" has
as $A "insert into cart_items(user_id,product_id,quantity) values ('$A','$P2',1)" >/dev/null
expect "customer cannot add to someone else's cart" "row-level security" "$(ast $A "insert into cart_items(user_id,product_id,quantity) values ('$B','$P1',1)")" has
OA=$(as $A "select place_order('Cust A','+93 700 000 000','Afghanistan','Kabul','Street 1',null)")
expect "place_order returns an order id" "-" "$OA" has
as $B "insert into cart_items(user_id,product_id,quantity) values ('$B','$P2',3)" >/dev/null
OB=$(as $B "select place_order('Cust B','+91 98765 43210','India','Delhi','Road 2',null)")
expect "stock reduced P1 (10-2)" "8" "$($PSQL -c "select stock_quantity from products where id='$P1'")"
expect "stock reduced P2 (10-1-3)" "6" "$($PSQL -c "select stock_quantity from products where id='$P2'")"
expect "order confirmed with totals" "confirmed|200.00|200.00" "$($PSQL -c "select status||'|'||total_afn||'|'||total_inr from orders where id='$OA'")"
expect "cart emptied" "0" "$($PSQL -c "select count(*) from cart_items")"
expect "bad phone rejected" "valid phone" "$(ast $C "select place_order('C','abc','x','y','z',null)")" has
$PSQL -c "insert into cart_items(user_id,product_id,quantity) values ('$S1','$P1',1)" >/dev/null
expect "seller cannot order own product" "cannot order your own" "$(ast $S1 "select place_order('S','+93 700 000 000','Afghanistan','Kabul','x',null)")" has
$PSQL -c "delete from cart_items" >/dev/null

echo "== reads: customers"
expect "A sees only own order"        "1" "$(as $A "select count(*) from orders")"
expect "A sees own 2 order items"     "2" "$(as $A "select count(*) from order_items")"
expect "A cannot read B's order by id" "0" "$(as $A "select count(*) from orders where id='$OB'")"
expect "B sees only own order"        "1" "$(as $B "select count(*) from orders")"
expect "B sees own 1 order item"      "1" "$(as $B "select count(*) from order_items")"
expect "outsider C sees no orders"    "0" "$(as $C "select count(*) from orders")"
expect "outsider C sees no items"     "0" "$(as $C "select count(*) from order_items")"
echo "== reads: sellers"
expect "S1 sees only the order with its product" "1" "$(as $S1 "select count(*) from orders")"
expect "S1 sees only its own order item"  "1" "$(as $S1 "select count(*) from order_items")"
expect "S1 item is its own"               "$P1" "$(as $S1 "select product_id from order_items")"
expect "S2 sees both orders containing its product" "2" "$(as $S2 "select count(*) from orders")"
expect "S2 sees only its 2 items (not S1's)" "2" "$(as $S2 "select count(*) from order_items")"
expect "S1 cannot see B's order" "0" "$(as $S1 "select count(*) from orders where id='$OB'")"
echo "== reads: admin and CRM"
expect "admin sees all orders"     "2" "$(as $AD "select count(*) from orders")"
expect "admin sees all items"      "3" "$(as $AD "select count(*) from order_items")"
expect "CRM sees all orders"       "2" "$(as $CRM "select count(*) from orders")"
expect "CRM sees all items"        "3" "$(as $CRM "select count(*) from order_items")"
expect "CRM sees all profiles"     "7" "$(as $CRM "select count(*) from profiles")"
echo "== reads: anonymous"
expect "anon denied on orders"      "permission denied" "$(asanon "select count(*) from orders")"
expect "anon denied on order_items" "permission denied" "$(asanon "select count(*) from order_items")" has
expect "anon cannot call helper"    "permission denied" "$(asanon "select seller_has_items_in_order('$OA')")"
echo "== helper only answers for the caller"
expect "S1 helper true for own order"      "t" "$(as $S1 "select seller_has_items_in_order('$OA')")"
expect "S1 helper false for order without its items" "f" "$(as $S1 "select seller_has_items_in_order('$OB')")"
expect "customer helper false"             "f" "$(as $A "select seller_has_items_in_order('$OA')")"

echo "== writes denied to non-admins"
for who in "A:$A" "S1:$S1" "CRM:$CRM"; do n=${who%%:*}; u=${who#*:}
  expect "$n cannot update orders (0 rows)" "UPDATE 0" "$(ast $u "update orders set notes='hack' where id='$OA'")" has
  expect "$n cannot delete orders"          "permission denied" "$(ast $u "delete from orders where id='$OA'")" has
  expect "$n cannot insert order_items"     "permission denied" "$(ast $u "insert into order_items(order_id,product_id,seller_id,product_name,unit_price,currency,quantity) values ('$OA','$P1','$u','x',1,'AFN',1)")" has
done
expect "A cannot update B's order (0 rows)" "UPDATE 0" "$(ast $A "update orders set notes='x' where id='$OB'")" has

echo "== 0010 guards (admin path) and restock"
expect "admin moves confirmed -> processing" "UPDATE 1" "$(ast $AD "update orders set status='processing' where id='$OA'")" has
expect "admin cannot move backwards"         "back to"    "$(as $AD "update orders set status='confirmed' where id='$OA'")"
expect "owner cannot be changed"             "cannot be changed" "$(as $AD "update orders set user_id='$B' where id='$OA'")"
expect "totals cannot be changed after confirm" "cannot be changed" "$(ast $AD "update orders set total_afn=1 where id='$OA'")" has
expect "admin saves delivery details"        "UPDATE 1" "$(ast $AD "update orders set tracking_number='TRK1', delivery_method='Courier' where id='$OA'")"
expect "admin cancels order"                 "UPDATE 1" "$(ast $AD "update orders set status='cancelled' where id='$OA'")"
expect "restock P1 after cancel (back to 10)" "10" "$($PSQL -c "select stock_quantity from products where id='$P1'")"
expect "restock P2 after cancel (6+1=7)"      "7"  "$($PSQL -c "select stock_quantity from products where id='$P2'")"
expect "cancelled is final"                  "can no longer change" "$(as $AD "update orders set status='confirmed' where id='$OA'")"
as $AD "update orders set status='processing' where id='$OB'" >/dev/null; as $AD "update orders set status='shipped' where id='$OB'" >/dev/null; as $AD "update orders set status='delivered' where id='$OB'" >/dev/null
expect "delivered is final"                  "can no longer change" "$(as $AD "update orders set status='cancelled' where id='$OB'")"
expect "delivered order not restocked"       "7"  "$($PSQL -c "select stock_quantity from products where id='$P2'")"
expect "order_items still readable after status changes (customer)" "2" "$(as $A "select count(*) from order_items")"
echo; echo "RESULT: $PASS passed, $FAIL failed"; [ $FAIL -eq 0 ]
