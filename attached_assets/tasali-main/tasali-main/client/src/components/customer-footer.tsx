export function CustomerFooter() {
  return (
    <footer className="bg-muted/20 py-6 border-t text-center space-y-1">
      <p className="text-xs text-muted-foreground/40 font-medium">
        © {new Date().getFullYear()} تسالي كرومش — جميع الحقوق محفوظة
      </p>
      <a
        href="https://qiroxstudio.online"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity"
        style={{ color: "var(--primary)" }}
      >
        Powered by <span className="font-black">QIROX STUDIO</span>
      </a>
    </footer>
  );
}
