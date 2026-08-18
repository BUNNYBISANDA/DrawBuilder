export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer">
      © {year} Galle Zonal Draw Builder — developed by Sathush &amp; Bisanda
    </footer>
  );
}
