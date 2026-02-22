import { LanguageProvider } from "./i18n/LanguageContext";
import ImageCompressor from "./components/ImageCompressor";

export default function Home() {
  return (
    <LanguageProvider>
      <ImageCompressor />
    </LanguageProvider>
  );
}
