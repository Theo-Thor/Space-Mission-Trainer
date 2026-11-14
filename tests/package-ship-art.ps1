$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class ShipPack {
  public static string Process(string srcPath, string destPath) {
    using (Bitmap loaded = new Bitmap(srcPath)) {
      int w = loaded.Width, h = loaded.Height;
      Rectangle rect = new Rectangle(0, 0, w, h);
      BitmapData bits = loaded.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      int stride = bits.Stride;
      byte[] pix = new byte[stride * h];
      Marshal.Copy(bits.Scan0, pix, 0, pix.Length);
      loaded.UnlockBits(bits);

      bool[] clear = FloodWhite(pix, stride, w, h);
      byte[] alpha = new byte[w * h];
      for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
        int i = y * w + x;
        int o = y * stride + x * 4;
        if (clear[i] || Magenta(pix[o + 2], pix[o + 1], pix[o])) continue;
        alpha[i] = 255;
      }
      int left = w, top = h, right = 0, bottom = 0, count = 0;
      for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) if (alpha[y * w + x] > 0) {
        count++;
        if (x < left) left = x; if (y < top) top = y; if (x > right) right = x; if (y > bottom) bottom = y;
      }
      if (count < 50) throw new Exception("empty " + destPath);
      using (Bitmap frame = new Bitmap(right - left + 1, bottom - top + 1, PixelFormat.Format32bppArgb)) {
        BitmapData outBits = frame.LockBits(new Rectangle(0, 0, frame.Width, frame.Height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        byte[] raw = new byte[outBits.Stride * frame.Height];
        for (int y = top; y <= bottom; y++) for (int x = left; x <= right; x++) {
          if (alpha[y * w + x] == 0) continue;
          int s = y * stride + x * 4;
          int d = (y - top) * outBits.Stride + (x - left) * 4;
          raw[d] = pix[s]; raw[d + 1] = pix[s + 1]; raw[d + 2] = pix[s + 2]; raw[d + 3] = 255;
        }
        Marshal.Copy(raw, 0, outBits.Scan0, raw.Length);
        frame.UnlockBits(outBits);
        frame.Save(destPath, ImageFormat.Png);
      }
      return System.IO.Path.GetFileName(destPath) + " " + (right - left + 1) + "x" + (bottom - top + 1);
    }
  }

  static bool Magenta(byte r, byte g, byte b) {
    return r > 170 && b > 90 && g < 130 && r > g + 50 && b > g + 20;
  }

  static bool[] FloodWhite(byte[] pix, int stride, int w, int h) {
    bool[] bg = new bool[w * h];
    int[] queue = new int[w * h];
    int qh = 0, qt = 0;
    for (int x = 0; x < w; x++) { Seed(pix, stride, bg, queue, ref qt, w, x, 0); Seed(pix, stride, bg, queue, ref qt, w, x, h - 1); }
    for (int y = 0; y < h; y++) { Seed(pix, stride, bg, queue, ref qt, w, 0, y); Seed(pix, stride, bg, queue, ref qt, w, w - 1, y); }
    while (qh < qt) {
      int i = queue[qh++];
      int x = i % w, y = i / w;
      if (x > 0) Seed(pix, stride, bg, queue, ref qt, w, x - 1, y);
      if (x + 1 < w) Seed(pix, stride, bg, queue, ref qt, w, x + 1, y);
      if (y > 0) Seed(pix, stride, bg, queue, ref qt, w, x, y - 1);
      if (y + 1 < h) Seed(pix, stride, bg, queue, ref qt, w, x, y + 1);
    }
    return bg;
  }

  static void Seed(byte[] pix, int stride, bool[] bg, int[] queue, ref int qt, int w, int x, int y) {
    int i = y * w + x;
    if (bg[i]) return;
    int o = y * stride + x * 4;
    if (pix[o + 2] < 242 || pix[o + 1] < 242 || pix[o] < 242) return;
    bg[i] = true;
    queue[qt++] = i;
  }
}
'@

$dest = Join-Path $PSScriptRoot '../public/assets/ship'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$srcRoot = 'C:\Users\David\.cursor\projects\c-Users-David-Downloads-GIthub-7-Space-Mission-Trainer\assets'
$resolved = (Resolve-Path $dest).Path
foreach ($id in @('flight-console','comms-console','center-console','pilot-seat','avionics-rack','stowage-locker','bay-locker','pressure-hatch','door-frame')) {
  $src = Join-Path $srcRoot ($id + '.jpg')
  Copy-Item $src (Join-Path $resolved ($id + '-source.jpg')) -Force
  Write-Output ([ShipPack]::Process($src, (Join-Path $resolved ($id + '.png'))))
}
