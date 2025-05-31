import { cn } from "@/lib/utils";

export const metadata = {
  title: {
    template: "%s | ReShare",
    default: "Authentication | ReShare",
  },
  description: "Secure authentication for your ReShare account",
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return <div className={cn("flex min-h-screen items-center justify-center ")}>{children}</div>;
};

export default AuthLayout;
