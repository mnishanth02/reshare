import Header from "@/components/header";
import { cn } from "@/lib/utils";

export const metadata = {
  title: {
    template: "%s | ReShare",
    default: "Dashboard | ReShare",
  },
  description: "View and manage your journeys on ReShare",
};

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className={cn("flex flex-col min-h-screen")}>
      <Header />
      {children}
    </div>
  );
};

export default DashboardLayout;
