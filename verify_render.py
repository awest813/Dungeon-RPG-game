import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        # Include hardware acceleration flags
        browser = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'])
        page = await browser.new_page()

        print("Navigating to local dev server...")
        await page.goto("http://localhost:5173/")

        # Click past the boot scene to enter Town
        print("Waiting for boot scene...")
        await page.wait_for_timeout(2000)
        print("Clicking anywhere to start...")
        await page.mouse.click(100, 100)

        # Wait for Town scene to load
        print("Waiting for Town scene...")
        await page.wait_for_timeout(2000)

        # Click the 'Enter Dungeon' button
        print("Clicking 'Enter Dungeon'...")
        await page.click("text='⚔ Enter Dungeon'")

        # Wait for Combat scene to load and render WebGL meshes
        print("Waiting for Combat scene to render meshes...")
        await page.wait_for_timeout(4000)

        # Capture screenshot
        screenshot_path = "combat_scene.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

asyncio.run(run())
