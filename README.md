# LabLeaf

Static browser app for reading common lab report values and showing general food examples. It does not diagnose disease.

## Enable the shareable website

1. In this repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Open **Actions → Deploy LabLeaf to GitHub Pages** and choose **Run workflow** on the `main` branch.

After the workflow succeeds, the shareable address will be `https://prath-amchawda.github.io/web-dev-project/`.

The app's image OCR runs in the visitor's browser with Tesseract.js. The first image scan downloads the OCR engine and English language model from jsDelivr; it does not upload the image to this repository or to an app backend. The published code is public because this repository is public.
