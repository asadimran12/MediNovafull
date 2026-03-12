package com.offline;

import android.content.ContentResolver;
import android.graphics.Bitmap;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class PdfToImageModule extends ReactContextBaseJavaModule {

    PdfToImageModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "PdfToImageModule";
    }

    @ReactMethod
    public void convertPdfToImages(String uriString, Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            ContentResolver resolver = context.getContentResolver();
            Uri uri = Uri.parse(uriString);

            // Copy content URI to a temp file so PdfRenderer can use it
            File tempPdf = File.createTempFile("pdf_temp_", ".pdf", context.getCacheDir());
            InputStream inputStream = resolver.openInputStream(uri);
            FileOutputStream fos = new FileOutputStream(tempPdf);
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                fos.write(buffer, 0, bytesRead);
            }
            fos.close();
            inputStream.close();

            // Open the temp file with PdfRenderer
            ParcelFileDescriptor pfd = ParcelFileDescriptor.open(tempPdf, ParcelFileDescriptor.MODE_READ_ONLY);
            PdfRenderer renderer = new PdfRenderer(pfd);

            WritableArray imageUris = Arguments.createArray();
            int pageCount = renderer.getPageCount();

            for (int i = 0; i < pageCount; i++) {
                PdfRenderer.Page page = renderer.openPage(i);

                // Render at 2x for better OCR quality
                int width = page.getWidth() * 2;
                int height = page.getHeight() * 2;

                Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                bitmap.eraseColor(0xFFFFFFFF); // White background
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                page.close();

                // Save bitmap to a temp file
                File imageFile = new File(context.getCacheDir(), "pdf_page_" + i + ".jpg");
                FileOutputStream imgFos = new FileOutputStream(imageFile);
                bitmap.compress(Bitmap.CompressFormat.JPEG, 90, imgFos);
                imgFos.close();
                bitmap.recycle();

                imageUris.pushString(Uri.fromFile(imageFile).toString());
            }

            renderer.close();
            pfd.close();
            tempPdf.delete();

            promise.resolve(imageUris);
        } catch (Exception e) {
            promise.reject("PDF_ERROR", "Failed to convert PDF to images: " + e.getMessage(), e);
        }
    }
}
