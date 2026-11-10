# Divya Bharat 3D models (GLB)

One GLB per product (25). Procedural bottle/jar/pouch/tin/box shapes with the product photo labels wrapped on, PBR materials, glass via KHR_materials_transmission.

Preview: run the site and open /models/viewer.html, or drag a file into https://gltf-viewer.donmccurdy.com or Blender (File > Import > glTF).

Use on the site (after `npm i @google/model-viewer`, or via CDN script):

    <model-viewer src="/models/mustard-oil.glb" camera-controls auto-rotate style="width:100%;height:400px"></model-viewer>

Limits: shapes are generic, not scans; label text comes from the AI photos (some text errors); variants share one model per product. Replace labels with real photos for best quality.
