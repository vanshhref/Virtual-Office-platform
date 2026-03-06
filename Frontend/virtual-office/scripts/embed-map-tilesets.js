/**
 * Embeds external tilesets (XML) into map.json so Phaser can load it.
 * Run after copy-my-map. Reads XML tilesets, creates embedded tileset entries,
 * and outputs a Phaser-compatible map.
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const myMapDir = path.join(projectRoot, 'public', 'assets', 'maps');

const mapFiles = fs.readdirSync(myMapDir).filter(f => f.endsWith('.json') || f.endsWith('.tmj'));

if (mapFiles.length === 0) {
  console.warn('embed-map-tilesets: No map files found in', myMapDir);
  process.exit(0);
  return;
}

mapFiles.forEach(fileName => {
  const sourceMapPath = path.join(myMapDir, fileName);
  const mapData = JSON.parse(fs.readFileSync(sourceMapPath, 'utf8'));

  function parseTilesetXml(xmlPath, sourceDir) {
    if (!fs.existsSync(xmlPath)) return null;
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const nameMatch = xml.match(/name="([^"]+)"/);
    const twMatch = xml.match(/tilewidth="(\d+)"/);
    const thMatch = xml.match(/tileheight="(\d+)"/);
    const colsMatch = xml.match(/columns="(\d+)"/);
    const countMatch = xml.match(/tilecount="(\d+)"/);
    const imgSourceMatch = xml.match(/source="([^"]+\.(?:png|jpg|jpeg|gif))"/i);
    const imgTagMatch = xml.match(/<image[^>]*>/);
    const imgWidthMatch = imgTagMatch ? imgTagMatch[0].match(/width="(\d+)"/) : null;
    const imgHeightMatch = imgTagMatch ? imgTagMatch[0].match(/height="(\d+)"/) : null;
    
    const name = nameMatch ? nameMatch[1] : 'tileset';
    const tilewidth = parseInt(twMatch?.[1] || '32', 10);
    const tileheight = parseInt(thMatch?.[1] || '32', 10);
    const columns = parseInt(colsMatch?.[1] || '1', 10);
    const tilecount = parseInt(countMatch?.[1] || '1', 10);
    
    let imageSource = imgSourceMatch ? imgSourceMatch[1] : 'placeholder-tile.png';
    let imagewidth = parseInt(imgWidthMatch?.[1] || String(tilewidth * columns), 10);
    let imageheight = parseInt(imgHeightMatch?.[1] || String(Math.ceil(tilecount / columns) * tileheight), 10);
    
    // Image path relative to map (public/my-map/). E.g. "tilesets/office.png"
    const tilesetDir = path.dirname(xmlPath);
    const imageFullPath = path.join(tilesetDir, imageSource);
    const relPathForMap = (sourceDir && sourceDir !== '.') ? (sourceDir + '/' + imageSource).replace(/\/\//g, '/') : imageSource;
    const imageInPublic = path.join(myMapDir, relPathForMap.split('/').join(path.sep));
    const imageExists = fs.existsSync(imageFullPath) || fs.existsSync(imageInPublic);
    const relPath = imageExists ? relPathForMap : 'placeholder-tile.png';
    // Use local placeholder when image missing - single 32x32 tile
    const usePlaceholder = !imageExists;
    const finalImagePath = (imageExists ? relPath : 'placeholder-tile.png').split('/').pop();
    const finalImageWidth = usePlaceholder ? 32 : imagewidth;
    const finalImageHeight = usePlaceholder ? 32 : imageheight;
    const finalColumns = usePlaceholder ? 1 : columns;
    const finalTilecount = usePlaceholder ? 1 : tilecount;
    
    return {
      name,
      tilewidth,
      tileheight,
      columns: finalColumns,
      tilecount: finalTilecount,
      image: finalImagePath,
      imagewidth: finalImageWidth,
      imageheight: finalImageHeight,
    };
  }

  const embeddedTilesets = [];
  for (const ts of mapData.tilesets || []) {
    if (ts.source) {
      const sourceNormalized = ts.source.replace(/\\/g, '/').replace(/\/\//g, '/');
      const xmlPathToUse = path.join(myMapDir, sourceNormalized);
      const sourceDir = path.dirname(sourceNormalized);
      const parsed = parseTilesetXml(xmlPathToUse, sourceDir);
      if (parsed) {
        embeddedTilesets.push({
          firstgid: ts.firstgid,
          ...parsed,
        });
      } else {
        embeddedTilesets.push({
          firstgid: ts.firstgid,
          name: path.basename(ts.source, '.xml'),
          tilewidth: 32,
          tileheight: 32,
          columns: 1,
          tilecount: 1,
          image: 'placeholder-tile.png',
          imagewidth: 32,
          imageheight: 32,
        });
      }
    } else {
      embeddedTilesets.push(ts);
    }
  }

  mapData.tilesets = embeddedTilesets;
  fs.writeFileSync(sourceMapPath, JSON.stringify(mapData, null, 0));
  console.log('embed-map-tilesets: Embedded', embeddedTilesets.length, 'tilesets into', fileName);
});

// Create a 32x32 placeholder PNG if it doesn't exist (minimal valid PNG)
const placeholderPath = path.join(myMapDir, 'placeholder-tile.png');
if (!fs.existsSync(placeholderPath)) {
  const placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAOklEQVRYR+3OMQEAAAgDILV/5z3QwWABT5IkSZIkSZIkSZIkSZIkSZIkSXobNgABAwMDAwMDAwMDAwMDH+gDqW0AAQ0LnakAAAAASUVORK5CYII=';
  fs.writeFileSync(placeholderPath, Buffer.from(placeholderBase64, 'base64'));
  console.log('embed-map-tilesets: Created placeholder-tile.png');
}
