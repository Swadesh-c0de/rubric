"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import styles from "./StatCard.module.css";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant: "violet" | "gold" | "green" | "red";
}

export default function StatCard({ label, value, icon: Icon, variant }: StatCardProps) {
  const getVariantClass = () => {
    switch (variant) {
      case "violet": return styles.violet;
      case "gold": return styles.gold;
      case "green": return styles.green;
      case "red": return styles.red;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`glass-card ${styles.card}`}
    >
      <div className={`${styles.iconWrapper} ${getVariantClass()}`}>
        <Icon size={20} />
      </div>
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </div>
    </motion.div>
  );
}
