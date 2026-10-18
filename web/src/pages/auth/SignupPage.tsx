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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/toast";
import { Sparkles, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, User, Shield } from "lucide-react";

const signupSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const navigate = useNavigate();
  const setAuth = useSetAtom(authAtom);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "user",
    },
    mode: "onTouched",
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: SignupFormValues) => {
    setServerError(null);
    try {
      const res = await authApi.signup({
        email: data.email,
        password: data.password,
        role: data.role,
      });
      const token = res.data.token;
      saveToken(token);
      setAuth({ token });
      toast.success("Account created successfully! Welcome aboard.", "Sign Up Successful");
      navigate("/assessments");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string; errors?: Array<{ message?: string }> } } })
          ?.response?.data?.errors?.[0]?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Signup failed. Please try again with another email.";
      setServerError(msg);
      toast.error(msg, "Registration Failed");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100/70 to-teal-50/40 p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative backdrop elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-teal-400/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 shadow-md shadow-teal-500/20 text-white mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Create an Account
          </h1>
          <p className="text-sm text-slate-600 max-w-xs mx-auto">
            Get started with AI-driven interview assessments and candidate evaluation
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 shadow-xl shadow-slate-200/60 rounded-2xl p-6 sm:p-8 space-y-6">
          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-3 p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs sm:text-sm animate-in fade-in-50"
            >
              <div className="mt-0.5 shrink-0 text-red-600 font-bold">!</div>
              <p className="leading-relaxed">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "signup-email-error" : undefined}
                  className={`pl-10 h-11 text-sm bg-slate-50/50 border-slate-200 focus:bg-white transition-colors ${
                    errors.email ? "border-red-400 focus-visible:ring-red-400" : ""
                  }`}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p id="signup-email-error" role="alert" className="text-xs font-medium text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "signup-password-error" : undefined}
                  className={`pl-10 pr-10 h-11 text-sm bg-slate-50/50 border-slate-200 focus:bg-white transition-colors ${
                    errors.password ? "border-red-400 focus-visible:ring-red-400" : ""
                  }`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="signup-password-error" role="alert" className="text-xs font-medium text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-slate-700">Workspace Role</Label>
              <RadioGroup
                value={selectedRole}
                onValueChange={(val) => setValue("role", val as "admin" | "user")}
                className="grid grid-cols-2 gap-3"
              >
                <label
                  htmlFor="role-user"
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedRole === "user"
                      ? "border-teal-500 bg-teal-50/50 text-teal-900 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <RadioGroupItem value="user" id="role-user" className="text-teal-600" />
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>Assessor (User)</span>
                  </div>
                </label>

                <label
                  htmlFor="role-admin"
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedRole === "admin"
                      ? "border-teal-500 bg-teal-50/50 text-teal-900 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <RadioGroupItem value="admin" id="role-admin" className="text-teal-600" />
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Shield className="h-3.5 w-3.5 text-slate-500" />
                    <span>Admin</span>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 font-semibold text-sm bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition-all rounded-xl mt-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer Links */}
        <p className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-teal-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
