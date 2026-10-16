import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0", {
  variants: {
    variant: {
      info: "border-royal/20 bg-royal/5 text-midnight",
      error: "border-error/25 bg-error/8 text-[#a52f2f]",
      success: "border-success/25 bg-success/8 text-[#146b4f]",
      warning: "border-warning/30 bg-warning/10 text-[#8a5a12]",
    },
  },
  defaultVariants: { variant: "info" },
});

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export { Alert };
