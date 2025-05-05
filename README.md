# Recipe Scaler Web Application

This web application allows users to input a recipe and scale the ingredient quantities based on a selected number of servings. It consists of three HTML files, two JavaScript files, and a stylesheet.

## File Descriptions

1. **index.html**
   - This is the main landing page of the application.
   - It offers navigation links to either input a recipe (`enter_recipe.html`) or view the scaled recipe (`scaled.html`).
   - Basic instructions are provided to guide users through the application.

2. **enter_recipe.html**
   - This page allows the user to enter a recipe name, number of servings, and individual ingredients with quantities and units.
   - It includes buttons to add multiple ingredients dynamically.
   - Once filled, the user can scale the recipe or navigate back to the main page.

3. **scaled.html**
   - This page displays the scaled version of the recipe based on the selected number of servings.
   - It pulls the user input from the previous page (via `localStorage`) and calculates new ingredient quantities.
   - The user can return to the entry page or the main page from here.

4. **script.js**
   - This JavaScript file handles the logic for the **enter_recipe.html** page.
   - It manages dynamic form elements, validation, storing recipe data in `localStorage`, and navigation.
   - It ensures that ingredients can be added or removed interactively by the user.

5. **script-new.js**
   - This script is linked to **scaled.html**.
   - It retrieves the stored recipe data and performs the scaling calculations.
   - It dynamically updates the DOM to show the scaled recipe.

6. **styles.css**
   - This stylesheet defines the layout, colors, and responsiveness of the entire application.
   - It ensures a clean and user-friendly interface across all pages.

## How to Use

1. Open `index.html` in a browser.
2. Click on "Enter a Recipe" to input your recipe and serving details.
3. Click on "Scale Recipe" to view the scaled version based on your new serving requirement.

---

This project is useful for home cooks, meal preppers, and anyone looking to scale recipes without manual math.

