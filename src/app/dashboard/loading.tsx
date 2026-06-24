import styles from "./dashboard.module.css";

export default function DashboardLoading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loaderWrapper}>
        <div className={styles.premiumSpinner} />
        <p className={styles.loadingText}>Streaming academic logs...</p>
      </div>
    </div>
  );
}
