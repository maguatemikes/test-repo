import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex w-1/2 bg-primary text-white flex-col justify-between p-12">
        <div className="text-2xl font-bold tracking-tight">CRM</div>
        <div>
          <h1 className="text-4xl font-bold mb-4">Start free.</h1>
          <p className="text-base text-white/70 max-w-md">
            10 minutes from sign-up to first send.
          </p>
        </div>
        <div className="text-xs text-white/40">© 2026</div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <SignUp />
      </div>
    </div>
  );
}
