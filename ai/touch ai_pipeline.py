def extract_text(file_path):
    try:
        import pdfplumber
    except ImportError:
        return ""

    extracted_pages = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                if page is None:
                    continue

                try:
                    page_text = page.extract_text()
                except Exception:
                    page_text = ""

                if page_text:
                    extracted_pages.append(page_text)

        return "\n".join(extracted_pages).strip()
    except Exception:
        return ""
