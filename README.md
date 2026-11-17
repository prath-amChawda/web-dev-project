# LabLeaf

Static browser app for reading common lab report values and showing general food examples. It does not diagnose disease.

## Enable the shareable website

1. In this repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Open the **Actions** tab and check the “Deploy LabLeaf to GitHub Pages” workflow. The workflow publishes the site after the Pages source is enabled.

The app's image OCR runs in the visitor's browser with Tesseract.js. The first image scan downloads the OCR engine and English language model from jsDelivr; it does not upload the image to this repository or to an app backend. The published code is public because this repository is public.
