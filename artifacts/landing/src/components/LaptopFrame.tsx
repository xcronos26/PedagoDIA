import { cn } from "@/lib/utils";

interface LaptopFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
}

export function LaptopFrame({ src, alt, className, ...props }: LaptopFrameProps) {
  return (
    <div className={cn("relative w-full mx-auto", className)} {...props}>
      {/* Screen */}
      <div className="w-full rounded-t-xl bg-gray-800 border-[6px] border-gray-800 shadow-2xl overflow-hidden">
        <div className="w-full aspect-video">
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover object-top"
          />
        </div>
      </div>
      {/* Base */}
      <div className="h-4 md:h-6 bg-gray-900 rounded-b-xl shadow-xl flex items-center justify-center">
        <div className="w-1/4 h-1 bg-gray-700 rounded-full" />
      </div>
      {/* Stand */}
      <div className="mx-auto w-1/3 h-2 bg-gray-800 rounded-b-lg" />
    </div>
  );
}
