import { cn } from "@/lib/utils";

interface LaptopFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
}

export function LaptopFrame({ src, alt, className, ...props }: LaptopFrameProps) {
  return (
    <div className={cn("relative mx-auto max-w-4xl", className)} {...props}>
      <div className="relative pt-[60%] rounded-t-xl bg-gray-800 border-[6px] border-gray-800 shadow-2xl overflow-hidden">
        <img 
          src={src} 
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover object-top rounded-sm"
        />
      </div>
      <div className="relative h-6 md:h-10 bg-gray-900 rounded-b-xl md:rounded-b-2xl shadow-xl flex items-center justify-center">
        <div className="w-1/4 h-1 md:h-2 bg-gray-800 rounded-full"></div>
      </div>
    </div>
  );
}
