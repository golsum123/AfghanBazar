import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Image that falls back to a neutral placeholder when the URL is missing, expired or fails to load. */
export function SafeImage({
  src,
  alt,
  className,
  iconClassName = "size-6",
  loading,
}: {
  src?: string | undefined;
  alt: string;
  className?: string;
  iconClassName?: string;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div
        className="flex size-full items-center justify-center text-muted-foreground"
        role="img"
        aria-label={alt}
      >
        <ImageOff className={iconClassName} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className={cn("size-full object-cover", className)}
    />
  );
}
