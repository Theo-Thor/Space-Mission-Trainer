$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
public static class WalkBounds {
 public static Rectangle Find(Bitmap b,int c,int r) {
  int w=b.Width/4,h=b.Height/4,l=w,t=h,right=0,bottom=0;
  for(int y=0;y<h;y++)for(int x=0;x<w;x++)if(b.GetPixel(c*w+x,r*h+y).A>=128){l=Math.Min(l,x);right=Math.Max(right,x);t=Math.Min(t,y);bottom=Math.Max(bottom,y);}
  return new Rectangle(l,t,right-l+1,bottom-t+1);
 }
 public static double Head(Bitmap b,int c,int r,Rectangle bounds) {
  int w=b.Width/4,h=b.Height/4,l=w,right=0;
  for(int y=bounds.Top;y<bounds.Top+bounds.Height/5;y++)for(int x=0;x<w;x++)if(b.GetPixel(c*w+x,r*h+y).A>=128){l=Math.Min(l,x);right=Math.Max(right,x);}
  return (l+right)/2.0;
 }
}
'@
$assetRoot = Join-Path $PSScriptRoot '../public/assets/astronaut-v2'
foreach($outfit in @('uniform','spacesuit')) {
 $source=[System.Drawing.Bitmap]::new((Join-Path $assetRoot ($outfit+'-walk-source.png')))
 $bounds=@();$maxHeight=0
 foreach($r in 0..3){foreach($c in 0..3){$b=[WalkBounds]::Find($source,$c,$r);$bounds+= $b;$maxHeight=[Math]::Max($maxHeight,$b.Height)}}
 $scale= $(if($outfit -eq 'uniform'){470.0}else{484.0}) / $maxHeight
 $atlas=[System.Drawing.Bitmap]::new(1280,2048,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[System.Drawing.Graphics]::FromImage($atlas)
 $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 foreach($r in 0..3){foreach($c in 0..3){
  $b=$bounds[$r*4+$c];$center=[WalkBounds]::Head($source,$c,$r,$b)
  $tile=$source.Clone([System.Drawing.Rectangle]::new($c*$source.Width/4,$r*$source.Height/4,$source.Width/4,$source.Height/4),[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g.SetClip([System.Drawing.Rectangle]::new($c*320,$r*512,320,512))
  $dest=[System.Drawing.RectangleF]::new($c*320+160-$center*$scale,$r*512+488-$b.Bottom*$scale,$tile.Width*$scale,$tile.Height*$scale)
  $g.DrawImage($tile,$dest);$g.ResetClip();$tile.Dispose()
 }}
 $atlas.Save((Join-Path $assetRoot ($outfit+'-walk.png')),[System.Drawing.Imaging.ImageFormat]::Png)
 $g.Dispose();$atlas.Dispose();$source.Dispose()
 Write-Output ($outfit+' walk atlas: 4 directions x 4 frames, 320 x 512 cells')
}
