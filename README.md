# Enhanced Tuning

<br>
<img width="1346" height="705" alt="Skjermbilde fra 2026-04-27 20-49-49" src="https://github.com/user-attachments/assets/bef356b9-2297-496b-bab7-be970e6fed19" />

<br><br>
<h3>What's new in v3.1 - The Retro & Shortwave Update!</h3>
This update brings massive visual upgrades to your tuning experience, along with highly requested shortwave features and crucial under-the-hood fixes.

<ul>
 <li><strong>Analog Scale Integration:</strong> A massive thank you to <strong>Highpoint</strong> for providing a custom-tailored version of his brilliant <a href="https://github.com/Highpoint2000/RetroDesign" target="_blank">Retro Design Elements Plugin (v1.2)</a>! The beautiful analog dial and dual-rotary tuning knobs are now fully integrated directly into Enhanced Tuning, perfectly synced with our band-switching logic.</li>
 <li><strong>SW Station Names on the Dial:</strong> Shortwave tuning just got a lot easier! When tuning inside SW sub-bands (like 31m or 49m), active station names are now projected dynamically onto the analog dial glass. Distance calculations (km) in the tooltip are now automatically mapped to your server's exact QTH coordinates. <em>(Note: This feature requires the <a href="https://github.com/Overland-DX/AM-Station-Info)" target="_blank">AM Station Info Plugin</a> to be installed and active).</em></li>

 <li><strong>Some Bug Fixes</strong></li>
</ul>

<p style="color: #e74c3c; font-weight: bold;">⚠️ IMPORTANT UPGRADE NOTE:</p>
<p>When installing this update, it is highly recommended that you delete the following old files from your installation folder to prevent conflicts with the new Admin Panel and UI logic:</p>
<ul>
 <li><code>/EnhancedTuning/public/Enhanced_Tuning.css</code></li>
 <li><code>/EnhancedTuning/config.json</code></li>
</ul>
<br>


<br><br>
What's new in v3.0 - The Ultimate Tuning Overhaul!
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
