export interface DeliveryForm {
  full_name: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  notes: string;
}

export type DeliveryErrors = Partial<Record<keyof DeliveryForm, string>>;

/** Same pattern and limits as the `place_order` database function. */
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,19}$/;

const LIMITS: Record<keyof DeliveryForm, number> = {
  full_name: 120,
  phone: 30,
  country: 80,
  city: 80,
  address: 300,
  notes: 500,
};

const LABELS: Record<keyof DeliveryForm, string> = {
  full_name: "Full name",
  phone: "Phone",
  country: "Country",
  city: "City",
  address: "Address",
  notes: "Notes",
};

/** Client-side check of checkout delivery details; the database re-validates on order placement. */
export function validateDelivery(form: DeliveryForm): DeliveryErrors {
  const errors: DeliveryErrors = {};
  for (const key of Object.keys(LIMITS) as (keyof DeliveryForm)[]) {
    const value = form[key].trim();
    if (key !== "notes" && value === "") errors[key] = `${LABELS[key]} is required`;
    else if (value.length > LIMITS[key]) errors[key] = `${LABELS[key]} must be at most ${LIMITS[key]} characters`;
  }
  if (!errors.phone && !PHONE_PATTERN.test(form.phone.trim())) {
    errors.phone = "Enter a valid phone number, e.g. +93 70 123 4567";
  }
  return errors;
}
