-- Focus Frame Studio — full export for phpMyAdmin (XAMPP).
-- Creates focus_frame_db, the 4 tables and the seed data in one import.
-- For a cloud host, import schema.sql then seed.sql into the database the host gave you instead.

CREATE DATABASE IF NOT EXISTS focus_frame_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE focus_frame_db;

-- =====================================================================
-- Focus Frame Studio — normalized relational schema (MySQL 8 / MariaDB 10.4+)
--
-- Entities
--   categories  1 ──< products      (each product belongs to one category)
--   users       1 ──< loans         (a user can file many borrow requests)
--   products    1 ──< loans         (a product can appear in many loans)
--
-- This file has no CREATE DATABASE / USE statement on purpose, so it can be
-- run against any database: `focus_frame_db` on XAMPP, `defaultdb` on Aiven,
-- the database you created on TiDB Cloud / Railway / Clever Cloud, etc.
-- =====================================================================

CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  category_id         INT UNSIGNED  NOT NULL,
  name                VARCHAR(255)  NOT NULL,
  price               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  stock               INT           NOT NULL DEFAULT 0,
  low_stock_threshold INT           NOT NULL DEFAULT 6,
  description         TEXT          NULL,
  image               LONGTEXT      NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_category (category_id),
  KEY idx_products_name (name),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_products_price     CHECK (price >= 0),
  CONSTRAINT chk_products_stock     CHECK (stock >= 0),
  CONSTRAINT chk_products_threshold CHECK (low_stock_threshold >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users authenticate with Firebase (Google Sign-In). The backend copies each
-- signed-in account into this table so loans can reference it with a real
-- foreign key and reports can JOIN on it.
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  firebase_uid  VARCHAR(128) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  display_name  VARCHAR(255) NULL,
  role          ENUM('admin','student') NOT NULL DEFAULT 'student',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_firebase_uid (firebase_uid),
  KEY idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A loan is a student's request to borrow equipment.
-- Lifecycle: pending -> approved -> returned
--            pending -> rejected | cancelled
-- Approving a loan subtracts its quantity from products.stock and returning
-- it adds the quantity back (done inside a transaction by the API).
CREATE TABLE IF NOT EXISTS loans (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  product_id   INT UNSIGNED NOT NULL,
  quantity     INT          NOT NULL DEFAULT 1,
  status       ENUM('pending','approved','rejected','returned','cancelled') NOT NULL DEFAULT 'pending',
  purpose      VARCHAR(255) NULL,
  due_date     DATE         NOT NULL,
  admin_note   VARCHAR(255) NULL,
  requested_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at   DATETIME     NULL,
  returned_at  DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_loans_user (user_id),
  KEY idx_loans_product (product_id),
  KEY idx_loans_status (status),
  CONSTRAINT fk_loans_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_loans_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_loans_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- Focus Frame Studio — seed data
-- Run AFTER schema.sql. Contains 7 categories, 77 products, 3 demo users
-- and 8 demo loans so the dashboards have something to show.
-- Demo users have fake Firebase UIDs; real users are added automatically
-- the first time they sign in with Google.
-- =====================================================================

INSERT INTO categories (id, name, description) VALUES
  (1, 'Camera Body', 'Mirrorless, DSLR and compact camera bodies'),
  (2, 'Lens', 'Prime, zoom and macro lenses'),
  (3, 'Support', 'Tripods, gimbals, sliders and rigging'),
  (4, 'Lighting', 'Strobes, LED panels and light modifiers'),
  (5, 'Storage', 'Memory cards, SSDs and card readers'),
  (6, 'Bags & Cases', 'Backpacks, slings and hard cases'),
  (7, 'Aerial', 'Drones and drone accessories');

INSERT INTO products (id, category_id, name, price, stock, low_stock_threshold, description, image) VALUES
  (1, 1, 'Canon EOS R50 Mirrorless Camera', 45999.00, 8, 6, 'Compact APS-C mirrorless body with fast autofocus, ideal for everyday shoots and hybrid video work.', 'https://www.bhphotovideo.com/images/images500x500/canon_eos_r50_mirrorless_camera_1675811427_1748810.jpg'),
  (2, 1, 'Canon EOS R6 Mark II', 129990.00, 5, 6, 'Full-frame mirrorless body with in-body stabilization and rapid burst shooting for action and events.', 'https://www.bhphotovideo.com/images/images500x500/canon_eos_r6_mark_ii_1667348713_1733214.jpg'),
  (3, 1, 'Sony A7 IV Mirrorless Camera', 139990.00, 4, 6, '33MP full-frame hybrid camera balancing high-resolution stills with pro-grade 4K video.', 'https://www.bhphotovideo.com/images/images500x500/sony_ilce_7m4_b_alpha_a7_iv_mirrorless_1634812545_1667800.jpg'),
  (4, 1, 'Nikon Z6 III', 134990.00, 6, 6, 'Partially stacked sensor body delivering fast readout speeds for sports and wildlife photographers.', 'https://www.bhphotovideo.com/images/images500x500/nikon_nikon_z6_iii_mirrorless_1767311236_1835272.jpg'),
  (5, 1, 'Fujifilm X-T5', 109990.00, 7, 6, 'Retro-styled APS-C body with 40MP sensor and film simulation modes for distinctive color rendering.', 'https://www.bhphotovideo.com/images/images500x500/fujifilm_16953857_x_t5_body_black_coo_japan_1749129395_1899771.jpg'),
  (6, 1, 'Panasonic Lumix S5 II', 99990.00, 6, 6, 'Full-frame hybrid camera with phase-detect autofocus, popular among run-and-gun videographers.', 'https://www.bhphotovideo.com/images/images500x500/panasonic_dc_s5m2body9_lumix_s5_ii_mirrorless_1765190352_1936322.jpg'),
  (7, 1, 'Canon EOS 90D DSLR', 62990.00, 9, 6, 'APS-C DSLR with a 32.5MP sensor and long battery life, a reliable workhorse for travel shoots.', 'https://www.bhphotovideo.com/images/images500x500/canon_3616c016_eos_90d_dslr_camera_1566949680_1502488.jpg'),
  (8, 1, 'Sony ZV-E1 Vlogging Camera', 114990.00, 5, 6, 'Compact full-frame body tuned for solo content creators with AI-based subject tracking.', 'https://www.bhphotovideo.com/images/images500x500/sony_zv_e1_mirrorless_camera_black_1680084933_1759472.jpg'),
  (9, 1, 'OM System OM-1 Mark II', 104990.00, 4, 6, 'Weather-sealed Micro Four Thirds body with computational photography modes for outdoor shooters.', 'https://ca-en.explore.omsystem.com/media/catalog/product/transparent/o/m/om-1-mark-ii-body-product-image-body_o_95.webp?fit=bounds&height=1000&optimize=medium&width=1000'),
  (10, 1, 'Fujifilm X100VI Compact Camera', 99990.00, 10, 6, 'Fixed-lens compact with a leaf shutter and hybrid viewfinder, favored for street photography.', '/products/Fujifilm X100VI Compact Camera.webp'),
  (11, 1, 'Canon EOS R100', 29990.00, 12, 6, 'Entry-level full-frame-mount mirrorless body designed as an affordable start into the RF system.', 'https://prophotosupply.com/cdn/shop/files/6052C012_eos-r100-rf-s18-45mm-f4-5-6-3-is-stm-lens-kit_primary.png?v=1684949556&width=1445'),
  (12, 2, 'Canon RF 50mm F1.8 STM Lens', 11999.00, 14, 6, 'Lightweight prime lens with a wide f/1.8 aperture for creamy background blur and low-light portraits.', 'https://hniesfp.imgix.net/8/images/detailed/521/4515C005_1.jpg?auto=format%2Ccompress&bg=0FFF&fit=fill&h=1000&w=1500'),
  (13, 2, 'Sony FE 24-70mm F2.8 GM II', 149990.00, 5, 6, 'Professional standard zoom with constant f/2.8 aperture, a staple for weddings and editorial work.', 'https://cdn11.bigcommerce.com/s-6eafq5t88w/images/stencil/original/products/37088/71150/117803c__46575.1651249633.jpg?c=1'),
  (14, 2, 'Nikon Z 85mm f/1.8 S', 42990.00, 8, 6, 'Fast short telephoto prime with silky bokeh, purpose-built for flattering portrait compression.', 'https://www.bhphotovideo.com/images/images2500x2500/nikon_nikkor_z_85mm_f_1_8_1497159.jpg'),
  (15, 2, 'Sigma 18-35mm f/1.8 Art', 38990.00, 7, 6, 'Constant-aperture wide zoom prized for its sharpness, popular with APS-C documentary shooters.', 'https://www.sigmaphoto.com/media/catalog/product/1/8/18-35mm_01_1.jpg'),
  (16, 2, 'Canon RF 70-200mm F2.8L IS USM', 189990.00, 3, 6, 'Pro telephoto zoom with rock-solid stabilization, built for sports, wildlife, and event coverage.', '/products/Canon RF 70-200mm F2.8L IS USM.png'),
  (17, 2, 'Sony FE 16-35mm F2.8 GM', 139990.00, 6, 6, 'Ultra-wide fast zoom favored for landscapes, architecture, and expansive interior shots.', 'https://www.sony.jp/products/picture/SEL1635GM.jpg'),
  (18, 2, 'Nikon Z MC 105mm f/2.8 Macro', 54990.00, 6, 6, '1:1 macro lens with dedicated stabilization, ideal for product, insect, and fine-detail photography.', 'https://loremflickr.com/800/600/camera,lens?lock=18'),
  (19, 2, 'Fujifilm XF 35mm f/1.4 R', 32990.00, 9, 6, 'Classic 50mm-equivalent prime with a distinctive rendering loved by X-series street shooters.', 'https://loremflickr.com/800/600/camera,lens?lock=19'),
  (20, 2, 'Tamron 28-75mm f/2.8 Di III VXD', 59990.00, 10, 6, 'Third-party standard zoom offering GM-level sharpness at a friendlier price point.', '/products/Tamron 28-75mm f2.8 Di III VXD.webp'),
  (21, 2, 'Canon RF 15-35mm F2.8L IS USM', 149990.00, 4, 6, 'Wide-angle L-series zoom with stabilization, a go-to for landscape and astro photographers.', '/products/Canon RF 15-35mm F2.8L IS USM.webp'),
  (22, 2, 'Sigma 105mm f/2.8 Art Macro', 44990.00, 7, 6, 'Sharp true macro lens with Art-series build quality for close-up and detail work.', 'https://loremflickr.com/800/600/camera,lens?lock=22'),
  (23, 3, 'Manfrotto Compact Tripod', 5890.00, 11, 6, 'Lightweight aluminum tripod with a quick-release plate, built for stable shots on location shoots.', '/products/Manfrotto Compact Tripod.jpg'),
  (24, 3, 'Peak Design Travel Tripod', 32990.00, 6, 6, 'Ultra-packable carbon fiber tripod that collapses to the size of a water bottle for travel kits.', '/products/Peak Design Travel Tripod.jpg'),
  (25, 3, 'Manfrotto MVH500AH Fluid Video Head', 14990.00, 8, 6, 'Smooth fluid tripod head for panning shots, a favorite among run-and-gun video shooters.', '/products/Manfrotto MVH500AH Fluid Video Head.jpg'),
  (26, 3, 'DJI RS 3 Mini Gimbal Stabilizer', 24990.00, 7, 6, 'Compact 3-axis gimbal built for mirrorless cameras, keeping handheld footage silky smooth.', '/products/DJI RS 3 Mini Gimbal Stabilizer.jpg'),
  (27, 3, 'Joby GorillaPod 5K Kit', 6990.00, 15, 6, 'Flexible-leg tripod that wraps around railings and branches for creative, unconventional angles.', '/products/Joby GorillaPod 5K Kit.jpg'),
  (28, 3, 'Manfrotto Monopod 680B', 5490.00, 12, 6, 'Aluminum monopod for fast setup and stability at sporting events where mobility matters.', '/products/Manfrotto Monopod 680B.jpg'),
  (29, 3, 'Neewer Camera Slider Rail', 4990.00, 10, 6, 'Manual sliding rail for adding smooth lateral motion to product and interview footage.', '/products/Neewer Camera Slider Rail.jpg'),
  (30, 3, 'SmallRig Camera Cage Rig', 8990.00, 9, 6, 'Aluminum cage with mounting points for accessories, adding protection and modularity to any body.', '/products/SmallRig Camera Cage Rig.jpeg'),
  (31, 3, 'Manfrotto Super Clamp', 2490.00, 20, 6, 'Versatile clamp for rigging cameras or lights to poles, tables, and set pieces on location.', '/products/Manfrotto Super Clamp.jpg'),
  (32, 3, 'DJI RS 4 Pro Gimbal', 64990.00, 3, 6, 'Heavy-duty motorized gimbal supporting cinema cameras with advanced automated tracking.', '/products/DJI RS 4 Pro Gimbal.jpg'),
  (33, 3, 'Zhiyun Weebill 3 Gimbal', 34990.00, 5, 6, 'Compact gimbal with a built-in display, giving solo shooters full control over exposure on the rig.', '/products/Zhiyun Weebill 3 Gimbal.jpg'),
  (34, 4, 'Godox AD200Pro Studio Lighting Kit', 15990.00, 6, 6, 'Portable two-head strobe kit with softboxes, perfect for controlled studio and portrait lighting.', '/products/Godox AD200Pro Studio Lighting Kit.jpg'),
  (35, 4, 'Godox SL60W LED Video Light', 8990.00, 10, 6, 'Continuous daylight-balanced LED light with a fan-cooled body, ideal for interviews and vlogging.', '/products/Godox SL60W LED Video Light.jpg'),
  (36, 4, 'Aputure 120D II LED Light', 34990.00, 5, 6, 'High-output daylight LED with Bowens mount, a favorite key light for indie film sets.', '/products/Aputure 120D II LED Light.jpg'),
  (37, 4, 'Neewer 660 RGB LED Panel', 6490.00, 14, 6, 'Full-color RGB panel with adjustable hue and effects, useful for creative and mood lighting.', '/products/Neewer 660 RGB LED Panel.jpg'),
  (38, 4, 'Godox V1 Round Head Flash', 12990.00, 9, 6, 'On-camera speedlight with a round head for natural-looking catchlights in event photography.', '/products/Godox V1 Round Head Flash.jpg'),
  (39, 4, 'Godox 60x60cm Softbox', 2990.00, 18, 6, 'Compact softbox that diffuses strobe light for softer shadows in headshot and product setups.', '/products/Godox 60x60cm Softbox.jpg'),
  (40, 4, 'Neewer Ring Light 18-inch', 3990.00, 16, 6, 'Large ring light with adjustable color temperature, popular for beauty and vlog-style content.', '/products/Neewer Ring Light 18-inch.webp'),
  (41, 4, 'Godox AK-R21 Snoot Kit', 3490.00, 12, 6, 'Snoot and grid modifier set that narrows flash beams for dramatic, focused lighting effects.', '/products/Godox AK-R21 Snoot Kit.jpg'),
  (42, 4, 'Aputure MC RGB Pocket Light', 4990.00, 20, 6, 'Palm-sized RGB LED with app control, handy as a fill or accent light in tight spaces.', '/products/Aputure MC RGB Pocket Light.jpg'),
  (43, 4, 'Godox Wireless Flash Trigger X2T', 3290.00, 22, 6, 'Reliable radio trigger for firing off-camera flashes at long range with full manual control.', '/products/Godox Wireless Flash Trigger X2T.jpg'),
  (44, 4, 'Neewer Reflector 5-in-1 Kit', 1490.00, 25, 6, 'Collapsible reflector set for bouncing or diffusing natural light on outdoor portrait shoots.', '/products/Neewer Reflector 5-in-1 Kit.jpg'),
  (45, 5, 'SanDisk Extreme PRO 128GB SD Card', 1250.00, 32, 6, 'High-speed UHS-I memory card built for burst shooting and 4K video capture without dropped frames.', '/products/SanDisk Extreme PRO 128GB SD Card.png'),
  (46, 5, 'SanDisk Extreme PRO 256GB CFexpress Card', 8990.00, 10, 6, 'Ultra-fast CFexpress Type B card required for high-bitrate RAW video on flagship bodies.', '/products/SanDisk Extreme PRO 256GB CFexpress Card.png'),
  (47, 5, 'Lexar Professional 1667x 64GB SD Card', 990.00, 40, 6, 'Reliable UHS-II card offering fast write speeds at an accessible price for everyday shooting.', '/products/Lexar Professional 1667x 64GB SD Card.jpg'),
  (48, 5, 'SanDisk Extreme Portable SSD 1TB', 6990.00, 15, 6, 'Rugged pocket-sized SSD for fast on-location backups and transferring large video files.', '/products/SanDisk Extreme Portable SSD 1TB.jpg'),
  (49, 5, 'Samsung T7 Shield SSD 2TB', 11990.00, 12, 6, 'Water- and dust-resistant external SSD offering high-capacity, fast-transfer archival storage.', '/products/Samsung T7 Shield SSD 2TB.jpg'),
  (50, 5, 'SanDisk 64GB CompactFlash Card', 2490.00, 18, 6, 'Legacy-format CF card still used with older professional DSLR bodies and cinema cameras.', '/products/SanDisk 64GB CompactFlash Card.jpg'),
  (51, 5, 'Kingston Canvas React Plus 128GB microSD', 1690.00, 30, 6, 'Compact microSD card built for action cameras and drones needing durable, fast storage.', '/products/Kingston Canvas React Plus 128GB microSD.jpg'),
  (52, 5, 'SD Card Memory Wallet Organizer', 690.00, 28, 6, 'Waterproof carrying case that keeps a full set of memory cards organized and protected in a bag.', '/products/SD Card Memory Wallet Organizer.jpg'),
  (53, 5, 'SanDisk Professional G-DRIVE 4TB', 15990.00, 8, 6, 'Desktop-grade external hard drive for archiving finished projects and full-resolution masters.', '/products/SanDisk Professional G-DRIVE 4TB.jpg'),
  (54, 5, 'Angelbird AV Pro CFexpress 512GB', 16990.00, 6, 6, 'High-endurance CFexpress card rated for sustained 8K recording without thermal throttling.', 'https://www.angelbird.com/media/image/avp512cfxbsemk2_pdp/20250121_PDP-Header-Animation_SE-CFexpress-B-MK2_512GB_Preview_1120x630.webp?v=5924ig8wOD'),
  (55, 5, 'SanDisk SD Card Reader USB-C', 890.00, 35, 6, 'Fast USB-C card reader for quickly offloading footage from SD and microSD cards to a laptop.', '/products/SanDisk SD Card Reader USB-C.png'),
  (56, 6, 'Lowepro ProTactic Camera Backpack', 6990.00, 15, 6, 'Weatherproof camera backpack with customizable dividers for cameras, lenses, and accessories.', '/products/Lowepro ProTactic Camera Backpack.jpeg'),
  (57, 6, 'Peak Design Everyday Backpack 20L', 12990.00, 10, 6, 'Sleek, weatherproof daily-carry backpack with a flexible internal divider system for gear.', '/products/Peak Design Everyday Backpack 20L.jpg'),
  (58, 6, 'Pelican 1510 Hard Case', 14990.00, 7, 6, 'Crushproof, watertight hard case with customizable foam, built for checked-in air travel.', '/products/Pelican 1510 Hard Case.jpg'),
  (59, 6, 'Think Tank Retrospective 5 Shoulder Bag', 8490.00, 12, 6, 'Understated canvas shoulder bag for one body and two lenses, designed for discreet street shooting.', '/products/Think Tank Retrospective 5 Shoulder Bag.jpg'),
  (60, 6, 'Manfrotto Pro Light Camera Sling Bag', 5990.00, 14, 6, 'Cross-body sling bag with quick-access opening for fast lens changes during events.', '/products/Manfrotto Pro Light Camera Sling Bag.webp'),
  (61, 6, 'Peak Design Camera Cube Insert', 4490.00, 16, 6, 'Modular padded insert that turns any everyday backpack into a protective camera bag.', '/products/Peak Design Camera Cube Insert.webp'),
  (62, 6, 'Lowepro Lens Case Pouch Set', 1990.00, 22, 6, 'Padded, weather-resistant lens pouches sold as a set for organized storage inside a larger bag.', '/products/Lowepro Lens Case Pouch Set.jpg'),
  (63, 6, 'Pelican 1200 Micro Case', 3990.00, 18, 6, 'Compact hard case for small accessories like batteries, filters, and memory cards.', '/products/Pelican 1200 Micro Case.jpeg'),
  (64, 6, 'Think Tank Airport Roller Case', 18990.00, 5, 6, 'Carry-on-sized rolling case built to meet airline overhead bin limits for pro touring kits.', '/products/Think Tank Airport Roller Case.jpg'),
  (65, 6, 'Domke F-2 Canvas Bag', 7490.00, 11, 6, 'Classic photojournalist bag in rugged canvas, trusted for decades on editorial assignments.', '/products/Domke F-2 Canvas Bag.jpg'),
  (66, 6, 'Lowepro Dry Bag for Waterproof Storage', 2490.00, 20, 6, 'Roll-top waterproof bag that protects gear during boat trips, hikes, and rainy-day shoots.', '/products/Lowepro Dry Bag for Waterproof Storage.jpg'),
  (67, 7, 'DJI Mini 4 Pro Drone', 59990.00, 5, 6, 'Ultra-light drone with 4K HDR video and omnidirectional obstacle sensing for cinematic aerials.', '/products/DJI Mini 4 Pro Drone.jpeg'),
  (68, 7, 'DJI Air 3 Drone', 89990.00, 4, 6, 'Dual-camera drone with wide and telephoto lenses, extending creative range for aerial storytelling.', '/products/DJI Air 3 Drone.jpg'),
  (69, 7, 'DJI Mavic 3 Pro', 189990.00, 3, 6, 'Triple-camera flagship drone with a Hasselblad main sensor for professional-grade aerial cinematography.', '/products/DJI Mavic 3 Pro.png'),
  (70, 7, 'DJI Neo Mini Drone', 15990.00, 12, 6, 'Ultra-compact palm-launch drone with propeller guards, ideal for beginners and quick social clips.', '/products/DJI Neo Mini Drone.webp'),
  (71, 7, 'DJI Avata 2 FPV Drone', 74990.00, 6, 6, 'Immersive FPV drone with built-in propeller guards, popular for fast, dynamic first-person footage.', '/products/DJI Avata 2 FPV Drone.jpg'),
  (72, 7, 'DJI Mini 4 Pro Fly More Combo', 79990.00, 5, 6, 'Bundle adding extra batteries and a charging hub for extended aerial shoot days.', '/products/DJI Mini 4 Pro Fly More Combo.jpg'),
  (73, 7, 'DJI RC 2 Remote Controller', 17990.00, 9, 6, 'Standalone drone controller with a built-in bright display, removing the need for a phone.', '/products/DJI RC 2 Remote Controller.png'),
  (74, 7, 'DJI Care Refresh Drone Protection Plan', 4990.00, 25, 6, 'Replacement coverage plan that lowers repair costs after accidental drone crashes or water damage.', '/products/DJI Care Refresh Drone Protection Plan.webp'),
  (75, 7, 'DJI Mini 4 Pro Intelligent Flight Battery', 6490.00, 20, 6, 'Extra swappable flight battery that keeps aerial sessions going without long charging breaks.', '/products/DJI Mini 4 Pro Intelligent Flight Battery.jpg'),
  (76, 7, 'DJI ND Filter Set for Mini 4 Pro', 2990.00, 18, 6, 'Neutral density filter set that enables smooth, cinematic shutter speeds for aerial video.', '/products/DJI ND Filter Set for Mini 4 Pro.jpg'),
  (77, 7, 'DJI Flight Simulator License', 1990.00, 30, 6, 'Simulator software license for practicing drone maneuvers safely before flying real hardware.', '/products/DJI Flight Simulator License.jpg');

INSERT INTO users (id, firebase_uid, email, display_name, role) VALUES
  (1, 'seed-student-ana',   'ana.reyes@student.example',   'Ana Reyes',   'student'),
  (2, 'seed-student-paolo', 'paolo.cruz@student.example',  'Paolo Cruz',  'student'),
  (3, 'seed-student-bea',   'bea.santos@student.example',  'Bea Santos',  'student');

-- Due dates are relative to the day you import, so "overdue" always has data.
INSERT INTO loans (user_id, product_id, quantity, status, purpose, due_date, requested_at, decided_at, returned_at) VALUES
  (1,  5, 1, 'approved',  'Street photography class project', DATE_ADD(CURDATE(), INTERVAL 4 DAY),  DATE_SUB(NOW(), INTERVAL 3 DAY),  DATE_SUB(NOW(), INTERVAL 2 DAY),  NULL),
  (2, 26, 1, 'approved',  'Short film shoot',                 DATE_SUB(CURDATE(), INTERVAL 2 DAY),  DATE_SUB(NOW(), INTERVAL 9 DAY),  DATE_SUB(NOW(), INTERVAL 8 DAY),  NULL),
  (3, 36, 2, 'approved',  'Studio portrait session',          DATE_ADD(CURDATE(), INTERVAL 1 DAY),  DATE_SUB(NOW(), INTERVAL 2 DAY),  DATE_SUB(NOW(), INTERVAL 1 DAY),  NULL),
  (1, 67, 1, 'pending',   'Campus aerial footage',            DATE_ADD(CURDATE(), INTERVAL 7 DAY),  DATE_SUB(NOW(), INTERVAL 5 HOUR), NULL, NULL),
  (2, 45, 3, 'pending',   'Backup cards for event coverage',  DATE_ADD(CURDATE(), INTERVAL 3 DAY),  DATE_SUB(NOW(), INTERVAL 1 HOUR), NULL, NULL),
  (3, 23, 1, 'returned',  'Product photography',              DATE_SUB(CURDATE(), INTERVAL 5 DAY),  DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (1, 16, 1, 'returned',  'Sports event coverage',            DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 19 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY)),
  (2, 70, 1, 'rejected',  'Personal travel vlog',             DATE_ADD(CURDATE(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY),  DATE_SUB(NOW(), INTERVAL 3 DAY),  NULL);
