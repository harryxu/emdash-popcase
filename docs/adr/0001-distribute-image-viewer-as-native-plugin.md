# Distribute the image viewer as a reusable native plugin

The image viewer must enhance existing body images and gallery blocks without requiring authors to edit or resave content. Distribute it as a reusable native EmDash plugin, using the current site for development and verification, because native rendering extensions provide access to the existing Portable Text output and client integration.

Installation requires adding a project dependency, registering the plugin in the site's configuration, and redeploying. This trades installation through the EmDash plugin registry for the rendering and browser integration required by the feature.
