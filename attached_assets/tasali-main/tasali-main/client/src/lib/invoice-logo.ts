let _dataUrl: string = "";
let _promise: Promise<string> | null = null;

export function getInvoiceLogoDataUrl(): Promise<string> {
  if (_dataUrl) return Promise.resolve(_dataUrl);
  if (_promise) return _promise;
  _promise = fetch("/images/logo-bw.png")
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            _dataUrl = reader.result as string;
            resolve(_dataUrl);
          };
          reader.readAsDataURL(blob);
        })
    )
    .catch(() => "/images/logo-bw.png");
  return _promise;
}

export function preloadInvoiceLogo() {
  getInvoiceLogoDataUrl();
}
