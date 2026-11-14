$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class CrewPack {
  public static string Process(string srcPath, string destDir, string id) {
    using (Bitmap loaded = new Bitmap(srcPath)) {
      int w = loaded.Width, h = loaded.Height;
      Rectangle rect = new Rectangle(0, 0, w, h);
      BitmapData bits = loaded.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      int stride = bits.Stride;
      byte[] pix = new byte[stride * h];
      Marshal.Copy(bits.Scan0, pix, 0, pix.Length);
      loaded.UnlockBits(bits);

      bool dark = CornerLuma(pix, stride, w, h) < 80;
      bool[] bg = Flood(pix, stride, w, h, dark);
      byte[] alpha = new byte[w * h];
      for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
          int i = y * w + x;
          if (bg[i]) continue;
          int o = y * stride + x * 4;
          alpha[i] = Fringe(pix, stride, w, h, bg, x, y, dark);
        }
      }

      int[] label = new int[w * h];
      int[] area = new int[4096];
      long[] sumX = new long[4096];
      int[] minX = new int[4096], minY = new int[4096], maxX = new int[4096], maxY = new int[4096];
      int count = Label(alpha, w, h, label, area, sumX, minX, minY, maxX, maxY);

      int largest = 0;
      for (int n = 1; n <= count; n++) if (area[n] > largest) largest = area[n];
      int[] keep = new int[4];
      bool[] used = new bool[count + 1];
      int kept = 0;
      while (kept < 4) {
        int best = 0;
        for (int n = 1; n <= count; n++) {
          if (used[n] || area[n] < largest / 8) continue;
          if (best == 0 || area[n] > area[best]) best = n;
        }
        if (best == 0) break;
        used[best] = true;
        keep[kept++] = best;
      }
      if (kept != 4) throw new Exception(id + " expected 4 figures, found " + kept + " of " + count);

      Array.Sort(keep, delegate(int a, int b) {
        long ax = sumX[a] / area[a];
        long bx = sumX[b] / area[b];
        return ax.CompareTo(bx);
      });

      int maxH = 0;
      for (int k = 0; k < 4; k++) maxH = Math.Max(maxH, maxY[keep[k]] - minY[keep[k]] + 1);
      double scale = 470.0 / maxH;
      string[] views = new string[] { "front", "back", "left", "right" };
      for (int k = 0; k < 4; k++) {
        int n = keep[k];
        SaveFrame(pix, stride, w, h, label, alpha, n, minX[n], minY[n], maxX[n], maxY[n], scale, Path.Combine(destDir, id + "-" + views[k] + ".png"));
      }
      return id + " " + w + "x" + h + (dark ? " dark" : " light") + " scale " + scale.ToString("0.000") + " pieces " + count;
    }
  }

  static int CornerLuma(byte[] pix, int stride, int w, int h) {
    long sum = 0; int n = 0;
    for (int y = 0; y < 12; y++) {
      for (int x = 0; x < 12; x++) {
        int o = y * stride + x * 4;
        sum += pix[o + 2] + pix[o + 1] + pix[o];
        n++;
      }
    }
    return (int)(sum / (n * 3));
  }

  static bool IsBackground(byte b, byte g, byte r, bool dark) {
    if (dark) return r < 26 && g < 26 && b < 26;
    return r > 244 && g > 244 && b > 244;
  }

  static bool[] Flood(byte[] pix, int stride, int w, int h, bool dark) {
    bool[] bg = new bool[w * h];
    int[] queue = new int[w * h];
    int qh = 0, qt = 0;
    for (int x = 0; x < w; x++) { Seed(pix, stride, w, h, dark, bg, queue, ref qt, x, 0); Seed(pix, stride, w, h, dark, bg, queue, ref qt, x, h - 1); }
    for (int y = 0; y < h; y++) { Seed(pix, stride, w, h, dark, bg, queue, ref qt, 0, y); Seed(pix, stride, w, h, dark, bg, queue, ref qt, w - 1, y); }
    while (qh < qt) {
      int i = queue[qh++];
      int x = i % w, y = i / w;
      if (x > 0) Seed(pix, stride, w, h, dark, bg, queue, ref qt, x - 1, y);
      if (x + 1 < w) Seed(pix, stride, w, h, dark, bg, queue, ref qt, x + 1, y);
      if (y > 0) Seed(pix, stride, w, h, dark, bg, queue, ref qt, x, y - 1);
      if (y + 1 < h) Seed(pix, stride, w, h, dark, bg, queue, ref qt, x, y + 1);
    }
    return bg;
  }

  static void Seed(byte[] pix, int stride, int w, int h, bool dark, bool[] bg, int[] queue, ref int qt, int x, int y) {
    int i = y * w + x;
    if (bg[i]) return;
    int o = y * stride + x * 4;
    if (!IsBackground(pix[o], pix[o + 1], pix[o + 2], dark)) return;
    bg[i] = true;
    queue[qt++] = i;
  }

  static byte Fringe(byte[] pix, int stride, int w, int h, bool[] bg, int x, int y, bool dark) {
    bool edge = false;
    for (int dy = -1; dy <= 1 && !edge; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        int nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || bg[ny * w + nx]) { edge = true; break; }
      }
    }
    int o = y * stride + x * 4;
    byte b = pix[o], g = pix[o + 1], r = pix[o + 2];
    if (!edge) return 255;
    if (dark) {
      int lum = (r + g + b) / 3;
      if (lum < 18) return 0;
      if (lum < 48) return (byte)((lum - 18) * 255 / 30);
      return 255;
    }
    int min = Math.Min(r, Math.Min(g, b));
    if (min > 236) return 0;
    if (min > 214) return (byte)((236 - min) * 255 / 22);
    return 255;
  }

  static int Label(byte[] alpha, int w, int h, int[] label, int[] area, long[] sumX, int[] minX, int[] minY, int[] maxX, int[] maxY) {
    int count = 0;
    int[] stack = new int[w * h];
    for (int i = 0; i < w * h; i++) {
      if (alpha[i] < 16 || label[i] != 0) continue;
      count++;
      if (count >= area.Length) throw new Exception("too many pieces");
      minX[count] = w; minY[count] = h; maxX[count] = 0; maxY[count] = 0;
      int sp = 0;
      stack[sp++] = i;
      label[i] = count;
      while (sp > 0) {
        int p = stack[--sp];
        int x = p % w, y = p / w;
        area[count]++;
        sumX[count] += x;
        if (x < minX[count]) minX[count] = x;
        if (y < minY[count]) minY[count] = y;
        if (x > maxX[count]) maxX[count] = x;
        if (y > maxY[count]) maxY[count] = y;
        if (x > 0 && alpha[p - 1] >= 16 && label[p - 1] == 0) { label[p - 1] = count; stack[sp++] = p - 1; }
        if (x + 1 < w && alpha[p + 1] >= 16 && label[p + 1] == 0) { label[p + 1] = count; stack[sp++] = p + 1; }
        if (y > 0 && alpha[p - w] >= 16 && label[p - w] == 0) { label[p - w] = count; stack[sp++] = p - w; }
        if (y + 1 < h && alpha[p + w] >= 16 && label[p + w] == 0) { label[p + w] = count; stack[sp++] = p + w; }
      }
    }
    return count;
  }

  static void SaveFrame(byte[] pix, int stride, int w, int h, int[] label, byte[] alpha, int n, int left, int top, int right, int bottom, double scale, string path) {
    int height = bottom - top + 1;
    int headBottom = top + Math.Max(1, height / 5);
    long hx = 0; int hc = 0;
    for (int y = top; y < headBottom; y++) {
      for (int x = left; x <= right; x++) {
        if (label[y * w + x] == n) { hx += x; hc++; }
      }
    }
    double center = hc > 0 ? (double)hx / hc : (left + right) / 2.0;
    using (Bitmap piece = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
      Rectangle rect = new Rectangle(0, 0, w, h);
      BitmapData pb = piece.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
      byte[] outPix = new byte[Math.Abs(pb.Stride) * h];
      int outStride = pb.Stride;
      for (int y = top; y <= bottom; y++) {
        for (int x = left; x <= right; x++) {
          if (label[y * w + x] != n) continue;
          int src = y * stride + x * 4;
          int dst = y * outStride + x * 4;
          outPix[dst] = pix[src];
          outPix[dst + 1] = pix[src + 1];
          outPix[dst + 2] = pix[src + 2];
          outPix[dst + 3] = alpha[y * w + x];
        }
      }
      Bleed(outPix, outStride, w, h, left, top, right, bottom);
      Marshal.Copy(outPix, 0, pb.Scan0, outPix.Length);
      piece.UnlockBits(pb);
      using (Bitmap frame = new Bitmap(320, 512, PixelFormat.Format32bppArgb))
      using (Graphics g = Graphics.FromImage(frame)) {
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.CompositingQuality = CompositingQuality.HighQuality;
        float dw = w * (float)scale;
        float dh = h * (float)scale;
        float dx = 160f - (float)(center * scale);
        float dy = 488f - (bottom + 1) * (float)scale;
        g.DrawImage(piece, new RectangleF(dx, dy, dw, dh));
        frame.Save(path, ImageFormat.Png);
      }
    }
  }

  static void Bleed(byte[] pix, int stride, int w, int h, int left, int top, int right, int bottom) {
    int x0 = Math.Max(0, left - 16), y0 = Math.Max(0, top - 16);
    int x1 = Math.Min(w - 1, right + 16), y1 = Math.Min(h - 1, bottom + 16);
    for (int pass = 0; pass < 14; pass++) {
      for (int y = y0; y <= y1; y++) {
        for (int x = x0; x <= x1; x++) {
          int dst = y * stride + x * 4;
          if (pix[dst + 3] != 0) continue;
          int r = 0, g = 0, b = 0, n = 0;
          if (x > x0 && pix[dst - 4 + 3] > 0) { b += pix[dst - 4]; g += pix[dst - 3]; r += pix[dst - 2]; n++; }
          if (x < x1 && pix[dst + 4 + 3] > 0) { b += pix[dst + 4]; g += pix[dst + 5]; r += pix[dst + 6]; n++; }
          if (y > y0 && pix[dst - stride + 3] > 0) { b += pix[dst - stride]; g += pix[dst - stride + 1]; r += pix[dst - stride + 2]; n++; }
          if (y < y1 && pix[dst + stride + 3] > 0) { b += pix[dst + stride]; g += pix[dst + stride + 1]; r += pix[dst + stride + 2]; n++; }
          if (n == 0) continue;
          pix[dst] = (byte)(b / n);
          pix[dst + 1] = (byte)(g / n);
          pix[dst + 2] = (byte)(r / n);
          pix[dst + 3] = 1;
        }
      }
    }
    for (int y = y0; y <= y1; y++) {
      for (int x = x0; x <= x1; x++) {
        int dst = y * stride + x * 4;
        if (pix[dst + 3] == 1) pix[dst + 3] = 0;
      }
    }
  }
}
'@

$dest = Join-Path $PSScriptRoot '../public/assets/crew'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$srcRoot = 'C:\Users\David\.cursor\projects\c-Users-David-Downloads-GIthub-7-Space-Mission-Trainer\assets'
foreach ($id in @('val','chen','patel','leo','nia','crew','crew2')) {
  $src = Join-Path $srcRoot ($id + '-sheet.jpg')
  Copy-Item $src (Join-Path $dest ($id + '-source.jpg')) -Force
  Write-Output ([CrewPack]::Process($src, (Resolve-Path $dest), $id))
}
