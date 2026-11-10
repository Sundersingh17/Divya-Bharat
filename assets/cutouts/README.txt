Optional: transparent cut-outs that turn the 3D packs into true standees.

Name files <product-id>-front.png and <product-id>-back.png (transparent
background, pack only), e.g. mustard-oil-front.png, mustard-oil-back.png.
Then run:  node --env-file=.env.local scripts/upload-product-images.mjs --apply
(PNG -> WebP conversion needs:  npm i -D sharp).  Products without cut-outs keep
the photo-slab version automatically.
