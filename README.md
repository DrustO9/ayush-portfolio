# Ayush Kumar Maurya — AI Engineering Portfolio

**Live:** https://drusto9.github.io/ayush-portfolio/

A portfolio you can explore two ways:

- **Explore in 3D:** a car drives along a sunset beach and stops at a building for each part of the work: education, internships (Zepto, ixana.ai, 360 Realtors), projects, competitions, and contact at the pier.
- **Portfolio view:** the same work as a normal scrolling page. It works on any device, without 3D.

## Run it locally

The site is plain HTML, CSS and JavaScript with no build step. It has to be served (browsers block the 3D files when `index.html` is opened directly):

```bash
python tools/serve.py
```

Then open http://localhost:8123.

## Change the content

- Text, dates, links and which images each entry uses: `js/data.js`
- Images: `tools/gen_ai_images.py` crops the posters in `assets/photos/` into `assets/img/` (three sizes). Run `python -I -W ignore tools/gen_ai_images.py` after changing a poster.
- Section backgrounds of the page view: `assets/bg/`

## Check before publishing

```bash
python tools/check_assets.py
```

Lists any file the site asks for that is missing or spelled with different upper/lower case (GitHub Pages is case-sensitive).

## Deploy

Every push to `main` runs `.github/workflows/pages.yml`: it runs the asset check, checks the JavaScript parses, copies only the site files (`index.html`, `css/`, `js/`, `assets/` without the source photos) and publishes them to GitHub Pages.

## Credits

3D scene: sky, textures, rocks, plants, lanterns, the ship and buoys from [Poly Haven](https://polyhaven.com) (CC0). Coconut Palm and Curly Palm by evolveduk on Sketchfab (CC BY 4.0). Ferrari 458 Italia model by vicent091036 from the [three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf). Rendered with [three.js](https://threejs.org).
