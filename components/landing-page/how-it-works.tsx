import { cn } from "@/lib/utils";
import { FileUpIcon, Share2Icon, ZapIcon } from "lucide-react";

interface HowItWorksProps {
  className?: string;
}

interface StepProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function Step({ icon, title, description }: StepProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary shadow-md">
        {icon}
      </div>
      <h3 className="mb-3 font-semibold text-foreground text-xl">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export function HowItWorks({ className }: HowItWorksProps) {
  return (
    <section className={cn("w-full bg-secondary/30 py-20 md:py-28", className)}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="font-bold text-3xl text-primary tracking-tight sm:text-4xl">
            How It Works
          </h2>
          <p className="max-w-[700px] text-foreground text-lg">
            Turn your multi-day expeditions into beautiful shareable summaries in three simple
            steps.
          </p>

          <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
            <Step
              icon={<FileUpIcon className="h-7 w-7" />}
              title="Upload GPX Files"
              description="Upload multiple GPX files from each day of your expedition."
            />
            <Step
              icon={<ZapIcon className="h-7 w-7" />}
              title="Automatic Processing"
              description="Our system processes and merges your GPX data into one expedition."
            />
            <Step
              icon={<Share2Icon className="h-7 w-7" />}
              title="Share Your Journey"
              description="Get a beautiful visualization and stats to share with your community."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
