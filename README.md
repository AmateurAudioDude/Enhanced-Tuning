# Enhanced Tuning
Enhanced Tuning Plugin v3.0 for FM-DX-Webserver
<br>
<br>
🔥 What's new in v3.0 - The Ultimate Tuning Overhaul!
This is the biggest update yet, completely rebuilding how the plugin operates and interacts with the server.
 - Dedicated Admin Panel UI: Say goodbye to editing text files! All plugin settings, limits, layout choices, and band configurations are now managed through a sleek, built-in Admin Panel. Just click the new ⚙️ icon next to the FM button (Requires Admin login).
 - Experimental Scanner plugin Integration: Designed to work alongside the excellent Highpoint Scanner plugin! Enhanced Tuning now intercepts scanner commands below 30 MHz to keep your searches strictly within your active sub-band boundaries (like looping seamlessly within the 31m band). Because AM noise floors vary wildly, you can now set individual signal thresholds for all 17 sub-bands directly in the Admin Panel. (Note: This custom local scanner is highly experimental and still being fine-tuned!)
 - Smart kHz Direct Input: Entering frequencies on AM/SW is finally natural. Typing 9640 or 693 on AM bands will now automatically and seamlessly tune you to 9.640 MHz or 0.693 MHz without conflicting with the webserver's core FM shortcuts or other plugins.
 - Band Customization: You can now rename bands (e.g., change "OIRT" to "eFM"), adjust their visual boundaries, and set custom default tune frequencies entirely from the Admin Panel.
 - Multi-Instance Support: Running multiple tuners on the same PC? The plugin now fully supports the --config startup parameter, automatically generating separate, isolated configuration files for each of your tuners.
 - Mobile UI Fixes & Stability: Improved responsive design for smaller screens (band limits no longer overlap), squashed bugs related to tuning limits, and added proper session expiration handling.
<br><br>
A plugin for FM-DX-Webserver that enhances the user's tuning experience.
<br><br>
 - Band buttons to make it easier to navigate across a wide frequency range.
 - Adjustable tune step for both fine and coarse tuning. (FM: 10 kHz, 100 kHz and 1 MHz. AM: 1 kHz, 10 kHz, 100 kHz and 1 MHz)
 - AM bandwidth control to improve the DX experience. (3kHz, 4kHz, 6kHz, 8kHz) *
 - USA tuning steps for the FM (200kHz) and MW (10kHz) bands.
 - You can choose between two layouts and configure what is displayed in the new Admin Panel.

<br>
    
>**AM mode bandwidth works with all of the TEF6686_ESP32 firmware by Sjef Verhoeven, for example on portable units.<br>For the FM-DX-Tuner firmware by Konrad, it only works with units using the 6686 (F8602) TEF chip. For use with 6686 (F8605) and 6687 (F8705), such as the HeadLess TEF, a small modification to the firmware is required.*

<br>
If you feel you have the skills to flash your own Headless TEF, I have created a guide on how I did it 

[Flash Headless TEF with FM‐DX‐Tuner‐Modded.bin](https://github.com/Overland-DX/Enhanced-Tuning/wiki/Flash-Headless-TEF-with-FM%E2%80%90DX%E2%80%90Tuner%E2%80%90Modded.bin)

---
*With the Classic layout:*
<br>
<img width="794" height="368" alt="bilde" src="https://github.com/user-attachments/assets/2fbb5904-ecc2-4fff-bd95-f3214c165008" />
<br>

 
<br>
<img width="795" height="366" alt="bilde" src="https://github.com/user-attachments/assets/23bc4cd0-7b53-4c24-a9f0-48575281b704" />
<br>


<br>
<img width="792" height="369" alt="bilde" src="https://github.com/user-attachments/assets/a42aebd0-9858-43f6-a201-37670d2c41c0" />

---
*With the Modern layout:*
<br>
<img width="785" height="375" alt="bilde" src="https://github.com/user-attachments/assets/a59462ea-7253-498b-a511-751f1ca7e4ec" />
<br>
<br>
<img width="790" height="368" alt="bilde" src="https://github.com/user-attachments/assets/94ac071d-e393-4f5f-a859-a2373bf81d91" />

<br>
<br>
<img width="797" height="373" alt="bilde" src="https://github.com/user-attachments/assets/affd5b1b-e52b-4ffa-bc1e-fa5dc3697c38" />


---
*With no buttons*
<br>
<img width="796" height="381" alt="bilde" src="https://github.com/user-attachments/assets/5bcc235a-024c-44aa-a99f-f971ff7453b2" />
<br>

---



<br><br>
How to Install:

 1. Download the plugin and place it in the web server's plugin folder.

 2. Restart the server and activate the plugin in the admin panel.

 3. Restart the server again.

 4. If you want to customize the plugin, go to: plugins\EnhancedTuning\public\config.ini
    Set your preferences and save.

    

<br><br>
***For those updating from Band Selector, it is recommended to deactivate the old plugin and delete its files before installing Enhanced Tuning.***

<br><br><br>
Default values ​​in config.ini:
<br><br>
```
// ==========================================================================
// Enhanced Tuning – Configuration File
// ==========================================================================

/**
 * Choose the visual layout for the plugin.
 * 'modern': Side panel layout with a dedicated AM/SW view.
 * 'classic': Compact layout with buttons inside the frequency panel (v1 style).
 */
const LAYOUT_STYLE = 'modern'; // 'modern' or 'classic'


/**
 * Show/hide all new UI elements (side buttons, AM view, etc.).
 * Only effective if LAYOUT_STYLE is 'modern'.
 */
const HIDE_ALL_BUTTONS = false;


/**
 * Show/hide the "Band Loop" button.
 * If false, the loop functionality is completely disabled.
 */
const SHOW_LOOP_BUTTON = true;


/**
 * Show/hide the start ↔ end frequency range display under the main frequency.
 */
const SHOW_BAND_RANGE = true;


/**
 * Enable a button to toggle between 9kHz and 10kHz steps on the MW band.
 * The button only appears when the MW band is active.
 */
const ENABLE_MW_STEP_TOGGLE = true;


/**
 * Enable/disable the new "Tune Step" feature.
 * If set to false, clicking the frequency display will do nothing,
 * and tuning will always use the original system steps.
 */
const ENABLE_TUNE_STEP_FEATURE = true;


/**
 * Automatically reset the tune step to default after a period of inactivity.
 * Set to 0 to disable this feature (step will remain selected until clicked off).
 * Any other number is the timeout in seconds.
 */
const TUNE_STEP_TIMEOUT_SECONDS = 20; // 0 = disabled


/**
 * Define the regional tuning standard for frequency bands and steps.
 * This single setting controls AM/FM steps and frequency ranges.
 * 
 * Options:
 * 'international': Standard for Europe, Africa, Asia, Australia (9kHz AM, 100kHz FM).
 * 'americas':    Standard for North/South America (10kHz AM, 200kHz odd-step FM).
 * 'japan':       Standard for Japan (9kHz AM, 100kHz FM, 76-95 MHz band).
 */
const TUNING_STANDARD = 'international';


/**
 * Enable custom AM bandwidth handling.
 * REQUIRES the TEF6686_ESP32' firmware by Sjef Verhoeven (PE5PVB).
 * If your firmware does not accept AM BW, set this to false.
 * Note: This feature is currently being tested. Please provide feedback on Discord.
 */
const ENABLE_AM_BW = true;


/**
 * Select the firmware compatibility mode.
 * This setting is ONLY effective if ENABLE_AM_BW is set to true.
 * It adjusts the AM bandwidth commands to match your hardware's firmware.
 *
 * Valid options are:
 * - 'TEF6686_ESP32': For TEF6686 modules with Sjef Verhoeven's (PE5PVB) ESP32 firmware.
 * - 'FM-DX-Tuner':  For Arduino modules with kkonrad's FM-DX-Tuner firmware.
 *                    (Note: Does not currently support the 'headless tef' and 'ESP32 + tef 8705/8605 module devices.)
 */
const FIRMWARE_TYPE = 'FM-DX-Tuner';


/**
 * Automatically select a default AM bandwidth when entering AM mode (< 27 MHz).
 * EFFECTIVE ONLY if:
 *   - ENABLE_AM_BW === true, and
 *   - You are running the TEF6686_ESP32' firmware.
 * Set to false to keep the firmware/server’s default selection.
 */
const ENABLE_DEFAULT_AM_BW = false;


/**
 * The default AM bandwidth to select when ENABLE_DEFAULT_AM_BW is true.
 * EFFECTIVE ONLY with TEF6686_ESP32' AND when ENABLE_AM_BW === true.
 */
const DEFAULT_AM_BW_VALUE = '56000';


/**
 * Which bands are shown in the UI.
 * Order matters for the mobile selector; items must match keys in ALL_BANDS.
 * Default: ['FM', 'OIRT', 'SW', 'MW', 'LW'];
 */
const ENABLED_BANDS = ['FM', 'OIRT', 'SW', 'MW', 'LW'];


/**
 * Enable/disable saving the last tuned frequency for each band to localStorage.
 * Set to false to always tune to the default frequency for a band.
 * Only effective if LAYOUT_STYLE is 'modern'.
 */
const ENABLE_FREQUENCY_MEMORY = false;
