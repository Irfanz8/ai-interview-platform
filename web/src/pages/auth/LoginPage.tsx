import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSetAtom } from "jotai";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authAtom, saveToken } from "@/stores/authAtom";
import { authApi } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Terminal,
} from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address (e.g. name@company.com)"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useSetAtom(authAtom);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    try {
      const res = await authApi.login({ email: data.email, password: data.password });
      const token = res.data.token;
      saveToken(token);
      setAuth({ token });
      toast.success("Welcome back. Authenticated successfully.", "Signed In");
      navigate("/assessments");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string; errors?: Array<{ message?: string }> } } })
          ?.response?.data?.errors?.[0]?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Invalid email or password. Please verify your credentials.";
      setServerError(msg);
      toast.error(msg, "Authentication Failed");
    }
  };

  const handleQuickFill = () => {
    setValue("email", "assessor@rakamin.com", { shouldValidate: true });
    setValue("password", "password123", { shouldValidate: true });
    toast.info("Demo credentials applied: assessor@rakamin.com", "Auto-filled");
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#FAFAFA] text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Top minimal bar */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
            R
          </div>
          <span className="font-semibold text-sm tracking-tight text-slate-900">
            Rakamin AI Interview
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleQuickFill}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-md transition-colors"
          >
            <Terminal className="h-3 w-3 text-slate-500" />
            <span>Fill demo credentials</span>
          </button>
        </div>
      </header>

      {/* Main Form Center */}
      <main className="w-full max-w-[400px] mx-auto px-4 py-8 space-y-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Sign in to your account
          </h1>
          <p className="text-xs text-slate-500">
            Enter your credentials to access evaluations and candidate reports.
          </p>
        </div>

        {/* Crisp Card */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 sm:p-7 space-y-5">
          {serverError && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-red-200 bg-red-50/70 text-red-700 text-xs font-medium leading-relaxed"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email Field */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-medium text-slate-700">
                Email address
              </Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={`pl-9 h-9 text-xs sm:text-sm bg-white border-slate-200 rounded-lg focus-visible:ring-1 focus-visible:ring-slate-900 focus-visible:border-slate-900 transition-colors ${
                    errors.email ? "border-red-400 focus-visible:ring-red-400" : ""
                  }`}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p id="email-error" role="alert" className="text-[11px] font-medium text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-slate-700">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={`pl-9 pr-9 h-9 text-xs sm:text-sm bg-white border-slate-200 rounded-lg focus-visible:ring-1 focus-visible:ring-slate-900 focus-visible:border-slate-900 transition-colors ${
                    errors.password ? "border-red-400 focus-visible:ring-red-400" : ""
                  }`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="text-[11px] font-medium text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9 font-medium text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-colors mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Subdued demo helper */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Demo: assessor@rakamin.com</span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="font-medium text-slate-900 hover:underline"
            >
              Auto-fill
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center space-y-2">
          <p className="text-xs text-slate-500">
            Don't have an account?{" "}
            <Link to="/login" onClick={handleQuickFill} className="font-medium text-slate-900 hover:underline">
              Sign in with demo
            </Link>
          </p>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-slate-400">
        <p>Enterprise candidate assessment platform with tenant data isolation.</p>
      </footer>
    </div>
  );
}
