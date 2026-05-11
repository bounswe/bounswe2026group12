#!/usr/bin/env python3
"""Download fixture images from Pexels API.

One-time utility script. Downloads images for each recipe and story
in the mock database, resizes to max 800x800, and saves as compressed JPEG.

Usage:
    export PEXELS_API_KEY=your_key_here
    python scripts/download_fixture_images.py

Idempotent: skips files that already exist on disk.
"""

import os
import sys
import time
from pathlib import Path
from io import BytesIO

import requests
from PIL import Image

PEXELS_API_KEY = os.environ.get('PEXELS_API_KEY', '')
PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search'

FIXTURES_MEDIA = Path(__file__).resolve().parent.parent / 'app' / 'backend' / 'fixtures' / 'media'

MAX_SIZE = (800, 800)
JPEG_QUALITY = 75

# filename -> Pexels search query
RECIPE_QUERIES = {
    # -- Existing recipes (26) --
    "black_sea_sarma.jpg": "stuffed cabbage rolls",
    "aegean_grape_leaves.jpg": "stuffed grape leaves olive oil",
    "southeastern_sarma.jpg": "stuffed grape leaves pomegranate",
    "greek_dolmadakia.jpg": "greek dolmadakia stuffed vine leaves",
    "swedish_kaldolmar.jpg": "swedish cabbage rolls",
    "lebanese_grape_leaves.jpg": "lebanese stuffed grape leaves",
    "trabzon_kuymak.jpg": "kuymak muhlama cheese cornmeal",
    "istanbul_lahmacun.jpg": "lahmacun turkish pizza",
    "aegean_herb_borek.jpg": "turkish borek phyllo pastry",
    "red_lentil_soup.jpg": "red lentil soup turkish",
    "adana_kebab.jpg": "adana kebab grilled meat",
    "anatolian_manti.jpg": "turkish manti dumplings yogurt",
    "irish_soda_bread.jpg": "irish soda bread",
    "greek_moussaka.jpg": "greek moussaka eggplant",
    "lebanese_tabbouleh.jpg": "tabbouleh parsley salad",
    "lebanese_hummus.jpg": "hummus chickpea dip",
    "italian_ragu.jpg": "italian ragu pasta sauce",
    "levantine_kibbeh.jpg": "kibbeh fried bulgur",
    "indian_dal_tadka.jpg": "dal tadka indian lentils",
    "japanese_miso_soup.jpg": "miso soup tofu",
    "paneer_tikka_masala.jpg": "paneer tikka masala",
    "japanese_onigiri.jpg": "onigiri rice ball seaweed",
    "swedish_meatballs.jpg": "swedish meatballs cream sauce",
    "baklava.jpg": "baklava pistachio pastry",
    "buttermilk_scones.jpg": "buttermilk scones baked",
    "aegean_olive_oil_cake.jpg": "olive oil cake",
    # -- New recipes (54) --
    "persian_ghormeh_sabzi.jpg": "ghormeh sabzi persian herb stew",
    "persian_tahdig.jpg": "tahdig crispy rice persian",
    "persian_fesenjan.jpg": "fesenjan pomegranate walnut stew",
    "arabian_kabsa.jpg": "kabsa saudi rice dish",
    "arabian_shawarma.jpg": "shawarma meat wrap",
    "arabian_kunafa.jpg": "kunafa knafeh cheese pastry",
    "chinese_mapo_tofu.jpg": "mapo tofu sichuan",
    "chinese_xiaolongbao.jpg": "xiaolongbao soup dumplings",
    "chinese_char_siu.jpg": "char siu chinese bbq pork",
    "korean_bibimbap.jpg": "bibimbap korean rice bowl",
    "korean_kimchi_jjigae.jpg": "kimchi jjigae stew",
    "korean_bulgogi.jpg": "bulgogi korean grilled beef",
    "southeast_asian_pad_thai.jpg": "pad thai noodles",
    "southeast_asian_pho.jpg": "pho vietnamese soup",
    "southeast_asian_rendang.jpg": "rendang beef curry",
    "north_african_tagine.jpg": "moroccan tagine",
    "north_african_couscous.jpg": "couscous moroccan vegetables",
    "north_african_shakshuka.jpg": "shakshuka eggs tomato",
    "west_african_jollof.jpg": "jollof rice west african",
    "west_african_egusi.jpg": "egusi soup nigerian",
    "west_african_fufu.jpg": "fufu african dough soup",
    "east_african_injera.jpg": "injera ethiopian flatbread",
    "east_african_doro_wat.jpg": "doro wat ethiopian chicken",
    "east_african_ugali.jpg": "ugali cornmeal east african",
    "caribbean_jerk_chicken.jpg": "jerk chicken jamaican",
    "caribbean_rice_and_peas.jpg": "caribbean rice and peas",
    "caribbean_plantain.jpg": "fried plantain caribbean",
    "south_american_empanadas.jpg": "empanadas argentinian",
    "south_american_ceviche.jpg": "ceviche peruvian",
    "south_american_feijoada.jpg": "feijoada brazilian bean stew",
    "central_american_pupusas.jpg": "pupusas salvadoran",
    "central_american_tamales.jpg": "tamales corn husk",
    "central_american_gallo_pinto.jpg": "gallo pinto rice beans",
    "french_ratatouille.jpg": "ratatouille french vegetables",
    "french_croissant.jpg": "croissant french pastry",
    "french_coq_au_vin.jpg": "coq au vin chicken wine",
    "iberian_paella.jpg": "paella spanish seafood rice",
    "iberian_gazpacho.jpg": "gazpacho cold soup spanish",
    "iberian_bacalhau.jpg": "bacalhau portuguese codfish",
    "british_fish_and_chips.jpg": "fish and chips british",
    "british_shepherds_pie.jpg": "shepherds pie",
    "british_scones_cream.jpg": "cream tea scones clotted cream",
    "central_european_schnitzel.jpg": "wiener schnitzel",
    "central_european_goulash.jpg": "goulash hungarian",
    "central_european_strudel.jpg": "apple strudel pastry",
    "eastern_european_borscht.jpg": "borscht beet soup",
    "eastern_european_pierogi.jpg": "pierogi polish dumplings",
    "eastern_european_blini.jpg": "blini russian pancakes",
    "central_asian_plov.jpg": "plov uzbek pilaf rice",
    "central_asian_lagman.jpg": "lagman noodle soup central asian",
    "central_asian_samsa.jpg": "samsa pastry baked",
    "oceanian_pavlova.jpg": "pavlova meringue dessert fruit",
    "oceanian_meat_pie.jpg": "australian meat pie",
    "mediterranean_falafel.jpg": "falafel chickpea fried",
    "indian_aloo_gobi.jpg": "aloo gobi indian cauliflower potato curry",
}

STORY_QUERIES = {
    # -- Existing stories (16) --
    "story_black_sea_sarma.jpg": "grandmother cooking kitchen traditional",
    "story_aegean_sarma.jpg": "aegean olive grove mediterranean",
    "story_dolma_trail.jpg": "greek taverna food culture",
    "story_swedish_cabbage_rolls.jpg": "swedish winter comfort food",
    "story_buttermilk_substitute.jpg": "baking kitchen ingredients",
    "story_sunday_borek.jpg": "morning breakfast pastry homemade",
    "story_wedding_feast.jpg": "turkish wedding feast celebration",
    "story_miso_living.jpg": "japanese miso fermentation",
    "story_spice_road.jpg": "spice market colorful",
    "story_grandmothers_manti.jpg": "handmade dumplings grandmother",
    "story_italian_sundays.jpg": "italian family dinner table",
    "story_istanbul_street.jpg": "istanbul street food vendor",
    "story_lebanese_table.jpg": "lebanese mezze spread table",
    "story_baking_atlantic.jpg": "baking bread home kitchen",
    "story_yogurt_continents.jpg": "yogurt dairy traditional",
    "story_fermentation.jpg": "fermented food jars",
    # -- New stories (34) --
    "story_persian_new_year.jpg": "nowruz persian new year table",
    "story_persian_tea.jpg": "persian tea ceremony samovar",
    "story_arabian_coffee.jpg": "arabic coffee cardamom traditional",
    "story_arabian_dates.jpg": "dates arabian market",
    "story_chinese_dim_sum.jpg": "dim sum chinese family gathering",
    "story_chinese_new_year.jpg": "chinese new year feast dumplings",
    "story_korean_kimchi.jpg": "kimchi making kimjang korean",
    "story_korean_street.jpg": "korean street food market",
    "story_thai_market.jpg": "thai floating market food",
    "story_vietnamese_pho.jpg": "vietnamese street pho morning",
    "story_moroccan_market.jpg": "moroccan spice market souk",
    "story_ethiopian_coffee.jpg": "ethiopian coffee ceremony",
    "story_nigerian_feast.jpg": "nigerian celebration feast food",
    "story_west_african_market.jpg": "west african food market colorful",
    "story_jamaican_jerk.jpg": "jamaican jerk chicken outdoor grill",
    "story_caribbean_rum.jpg": "caribbean beach food culture",
    "story_argentinian_asado.jpg": "argentinian asado barbecue",
    "story_peruvian_market.jpg": "peruvian food market colorful",
    "story_brazilian_feijoada.jpg": "brazilian family meal gathering",
    "story_salvadoran_pupusas.jpg": "making pupusas hands dough",
    "story_french_boulangerie.jpg": "french bakery boulangerie morning",
    "story_french_bistro.jpg": "french bistro cozy dinner",
    "story_spanish_tapas.jpg": "spanish tapas bar evening",
    "story_portuguese_fishing.jpg": "portuguese fishing village food",
    "story_british_pub.jpg": "british pub food traditional",
    "story_british_tea.jpg": "afternoon tea british tradition",
    "story_german_christmas.jpg": "german christmas market food",
    "story_hungarian_kitchen.jpg": "hungarian kitchen grandmother cooking",
    "story_russian_dacha.jpg": "russian dacha garden food",
    "story_polish_christmas.jpg": "polish christmas eve dinner",
    "story_uzbek_bazaar.jpg": "uzbek bazaar central asian market",
    "story_silk_road_food.jpg": "silk road caravan spices",
    "story_australian_bbq.jpg": "australian barbecue outdoor",
    "story_mediterranean_harvest.jpg": "mediterranean olive harvest",
}


def download_image(query: str, dest: Path) -> bool:
    """Search Pexels and download the first result to dest."""
    headers = {'Authorization': PEXELS_API_KEY}
    params = {'query': query, 'per_page': 1, 'orientation': 'landscape'}
    resp = requests.get(PEXELS_SEARCH_URL, headers=headers, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    if not data.get('photos'):
        print(f"  WARNING: No results for '{query}'")
        return False

    photo_url = data['photos'][0]['src']['medium']
    img_resp = requests.get(photo_url, timeout=15)
    img_resp.raise_for_status()

    img = Image.open(BytesIO(img_resp.content))
    img = img.convert('RGB')
    img.thumbnail(MAX_SIZE, Image.LANCZOS)
    img.save(str(dest), 'JPEG', quality=JPEG_QUALITY, optimize=True)
    return True


def process_queries(queries: dict, subdir: str) -> tuple[int, int]:
    """Download images for a query map. Returns (downloaded, skipped) counts."""
    dest_dir = FIXTURES_MEDIA / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    skipped = 0

    for filename, query in queries.items():
        dest = dest_dir / filename
        if dest.exists():
            skipped += 1
            continue

        print(f"  Downloading {filename} (query: '{query}')...")
        try:
            if download_image(query, dest):
                downloaded += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  ERROR downloading {filename}: {e}")
            skipped += 1

        time.sleep(0.5)

    return downloaded, skipped


def main():
    if not PEXELS_API_KEY:
        print("ERROR: Set PEXELS_API_KEY environment variable.")
        print("Usage: export PEXELS_API_KEY=your_key_here")
        sys.exit(1)

    print(f"Target directory: {FIXTURES_MEDIA}")
    print()

    print(f"Processing {len(RECIPE_QUERIES)} recipe images...")
    r_dl, r_sk = process_queries(RECIPE_QUERIES, 'recipes')
    print(f"  Done: {r_dl} downloaded, {r_sk} skipped")
    print()

    print(f"Processing {len(STORY_QUERIES)} story images...")
    s_dl, s_sk = process_queries(STORY_QUERIES, 'stories')
    print(f"  Done: {s_dl} downloaded, {s_sk} skipped")
    print()

    total_dl = r_dl + s_dl
    total_sk = r_sk + s_sk
    print(f"TOTAL: {total_dl} downloaded, {total_sk} skipped, {total_dl + total_sk} total")


if __name__ == '__main__':
    main()
