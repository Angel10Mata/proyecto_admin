import "./globals.css";

export const metadata = {
  title: "BI RETAIL - DATA SYSTEM",
  description: "Sistema de carga y análisis de datos retail",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
