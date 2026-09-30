# Bầu Cua Web

Bản web được chuyển từ dự án Android mới nhất trong `AndroidStudioProjects/baucua`.

## Chạy thử cục bộ

Mở một máy chủ tĩnh tại thư mục `dist`, ví dụ:

```powershell
python -m http.server 8080 --directory dist
```

Sau đó mở `http://localhost:8080`.

## Đưa lên GitHub Pages

Đẩy toàn bộ repository lên nhánh `main`, sau đó vào **Settings → Pages → Source** và chọn **GitHub Actions**. Workflow trong `.github/workflows/pages.yml` sẽ xuất bản thư mục `dist`.
