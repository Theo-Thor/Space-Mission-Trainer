$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
public static class FacilityBounds {
 public static Rectangle Find(Bitmap b, Rectangle cell) {
  int l=cell.Right,t=cell.Bottom,r=cell.Left,bottom=cell.Top;
  for(int y=cell.Top;y<cell.Bottom;y++)for(int x=cell.Left;x<cell.Right;x++)if(b.GetPixel(x,y).A>=80){l=Math.Min(l,x);r=Math.Max(r,x);t=Math.Min(t,y);bottom=Math.Max(bottom,y);}
  l=Math.Max(cell.Left,l-2);t=Math.Max(cell.Top,t-2);r=Math.Min(cell.Right-1,r+2);bottom=Math.Min(cell.Bottom-1,bottom+2);
  return new Rectangle(l,t,r-l+1,bottom-t+1);
 }
}
'@
$root=Join-Path $PSScriptRoot '../public/assets/facility'
$source=[System.Drawing.Bitmap]::new((Join-Path $root 'kit-source.png'))
$names=@('desk','seat','plant','console','locker','storage','table','board','hatch','arch','platform','moon')
for($i=0;$i -lt 12;$i++) {
 $col=$i%4;$row=[int][Math]::Floor($i/4)
 $x=[int][Math]::Floor($col*$source.Width/4);$y=[int][Math]::Floor($row*$source.Height/3)
 $right=[int][Math]::Floor(($col+1)*$source.Width/4);$bottom=[int][Math]::Floor(($row+1)*$source.Height/3)
 $bounds=[FacilityBounds]::Find($source,[System.Drawing.Rectangle]::new($x,$y,$right-$x,$bottom-$y))
 $tile=$source.Clone($bounds,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $tile.Save((Join-Path $root ($names[$i]+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
 Write-Output ($names[$i]+': '+$tile.Width+' x '+$tile.Height)
 $tile.Dispose()
}
$source.Dispose()
