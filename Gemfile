# frozen_string_literal: true
source "https://rubygems.org"

gem "jekyll", "~> 3.9"
gem "jekyll-seo-tag"

# kramdown 2.x split GFM parsing into a separate gem; Jekyll defaults to GFM
# input, so this is required for the build to find the parser.
gem "kramdown-parser-gfm"

# ffi >= 1.17 requires Ruby >= 3.0; pin below that to stay compatible with the
# local toolchain. (Pulled in transitively via the listen/sass chain.)
gem "ffi", "< 1.17"
