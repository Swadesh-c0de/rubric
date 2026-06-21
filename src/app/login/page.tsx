"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import styles from "./login.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-card login-card"
        style={{ padding: "40px", maxWidth: "420px", width: "100%" }}
      >
        <div className={styles.header}>
          <div className={styles.brandLogo}>
            <svg className={styles.logoBracket} width="14" height="34" viewBox="0 0 12 32" fill="currentColor">
              <path d="M 12 0 L 4 0 L 0 4 L 0 28 L 4 32 L 12 32 L 12 28.5 L 6.5 28.5 L 3.5 25.5 L 3.5 6.5 L 6.5 3.5 L 12 3.5 Z" />
            </svg>
            <span className={styles.brandText}>rubric</span>
            <span className={styles.brandDot}>.</span>
            <svg className={styles.logoBracket} width="14" height="34" viewBox="0 0 12 32" fill="currentColor">
              <path d="M 0 0 L 8 0 L 12 4 L 12 28 L 8 32 L 0 32 L 0 28.5 L 5.5 28.5 L 8.5 25.5 L 8.5 6.5 L 5.5 3.5 L 0 3.5 Z" />
            </svg>
          </div>
          <p>Login to your premium attendance dashboard</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={styles.errorAlert}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <div className={styles.inputContainer}>
              <Mail className={styles.inputIcon} size={18} />
              <input
                id="email"
                type="email"
                required
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: "42px" }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className={styles.inputContainer}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: "42px", paddingRight: "42px" }}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "10px", padding: "12px" }}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                Sign In <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <span>Don&apos;t have an account?</span>{" "}
          <Link href="/signup" className={styles.link}>
            Sign up now
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
