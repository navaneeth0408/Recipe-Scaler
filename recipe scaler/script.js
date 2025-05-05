const API_KEY = 'AIzaSyCtGe8vWQ8-GOlz7SEYd-qq6VMMA-R6LE4'; // Replace with your actual API key

function getVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|\/u\/\w\/|embed\/|watch\?v=|&v=|v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Show loading spinner
function showLoading() {
  document.getElementById('loading').style.display = 'block';
}

// Hide loading spinner
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

function fetchIngredients() {
  const youtubeLink = document.getElementById("youtubeLink").value;
  const videoId = getVideoId(youtubeLink);

  if (videoId) {
    showLoading(); // Show loading spinner while fetching
    
    fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`)
      .then(response => response.json())
      .then(data => {
        if (data.items && data.items.length > 0) {
          const description = data.items[0].snippet.description;
          // Get the highest quality thumbnail available
          const thumbnails = data.items[0].snippet.thumbnails;
          const thumbnailUrl = thumbnails.maxres ? thumbnails.maxres.url : 
                              thumbnails.high ? thumbnails.high.url : 
                              thumbnails.medium ? thumbnails.medium.url : 
                              thumbnails.default.url;
          const videoTitle = data.items[0].snippet.title;
          displayThumbnail(thumbnailUrl, videoTitle);
          parseIngredients(description);
        } else {
          console.error('No items found in the API response.');
        }
        hideLoading(); // Hide loading spinner after fetch completes
      })
      .catch(error => {
        console.error('Error fetching video description:', error);
        hideLoading(); // Hide loading spinner in case of error
        alert('Error fetching video: ' + error.message);
      });
  } else {
    alert('Please enter a valid YouTube Video URL.');
  }
}

function displayThumbnail(thumbnailUrl, videoTitle) {
  const thumbnailContainer = document.getElementById("thumbnailContainer");
  if (thumbnailContainer) {
    thumbnailContainer.innerHTML = "";
    
    // Create thumbnail image with higher quality
    const img = document.createElement("img");
    img.src = thumbnailUrl;
    img.alt = "YouTube Thumbnail";
    img.loading = "eager"; // Prioritize loading
    thumbnailContainer.appendChild(img);

    // Create recipe title
    const title = document.createElement("p");
    title.innerText = videoTitle;
    thumbnailContainer.appendChild(title);
    
    // Get the YouTube link from the input field
    const youtubeLink = document.getElementById("youtubeLink").value;
    
    // Create "Watch on YouTube" link with styling moved to CSS
    const linkContainer = document.createElement("div");
    linkContainer.className = "video-source";
    
    const linkElement = document.createElement("a");
    linkElement.href = youtubeLink;
    linkElement.target = "_blank"; // Open in new tab
    linkElement.innerHTML = '<i class="fab fa-youtube"></i> Watch on YouTube';
    
    linkContainer.appendChild(linkElement);
    thumbnailContainer.appendChild(linkContainer);
  }
}

// Enhanced ingredient parsing with additional unit support and better recognition
function parseIngredients(description) {
  const units = [
    'cup', 'cups', 'teaspoon', 'teaspoons', 'tablespoon', 'tablespoons', 
    'tbsp', 'tsp', 'gram', 'grams', 'g', 'kg', 'kilogram', 'kilograms', 
    'ounce', 'ounces', 'oz', 'lb', 'pound', 'pounds', 'ml', 'milliliter', 
    'milliliters', 'liter', 'liters', 'l', 'dash', 'pinch', 'handful',
    'clove', 'cloves', 'bunch', 'can', 'cans', 'jar', 'jars', 'slice', 'slices'
  ];
  
  const unnecessaryKeywords = [
    'degree', 'minutes', 'oven', 'preheat', 'temperature', 'time', 
    'instagram', 'http', 'https', 'video', 'subscribe', 'cook', 'cooking',
    'yield', 'serves', 'servings', 'written', 'follow', 'comment', 'like'
  ];
  
  // Words that indicate instructions rather than ingredients
  const instructionIndicators = [
    'stir', 'mix', 'combine', 'heat', 'add', 'put', 'place', 'rub', 'coat',
    'sprinkle', 'bake', 'boil', 'simmer', 'chop', 'dice', 'slice', 'prepare',
    'wash', 'clean', 'drain', 'strain', 'grill', 'broil', 'season', 'marinate',
    'rest', 'cool', 'chill', 'refrigerate', 'store', 'pour', 'transfer',
    'remove', 'discard', 'serve', 'garnish', 'top', 'arrange', 'assemble',
    'until', 'when', 'while', 'then', 'next', 'step', 'repeat', 'continue'
  ];

  const lines = description.split('\n');
  
  // First, look for ingredient section markers
  let startLine = -1;
  let endLine = lines.length;
  
  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase();
    if (lowerLine.includes('ingredient') && lowerLine.endsWith(':')) {
      startLine = i + 1;
    }
    if (startLine >= 0 && (lowerLine.includes('instruction') || lowerLine.includes('direction'))) {
      endLine = i;
      break;
    }
  }
  
  // If we found ingredient section markers, use them, otherwise analyze the whole description
  const ingredientRange = startLine >= 0 ? lines.slice(startLine, endLine) : lines;
  
  // Apply filters to identify likely ingredients
  const ingredients = ingredientRange.filter(line => {
    const lowerLine = line.toLowerCase().trim();
    // Skip empty lines and very short lines
    if (lowerLine.length < 3) return false;
    
    // Skip lines that are just separators (lots of dashes or stars)
    if (/^[-*=]{5,}$/.test(lowerLine)) return false;
    
    // Skip lines that contain unnecessary keywords
    if (unnecessaryKeywords.some(keyword => lowerLine.includes(keyword))) return false;
    
    // Skip lines that start with numbers followed by periods (like "1." or "2.") which indicate steps
    if (/^\d+\./.test(lowerLine)) return false;
    
    // Skip lines that start with instruction indicators
    if (instructionIndicators.some(indicator => {
      // Check if the line starts with an instruction word after potential numbers
      const withoutNumbersPrefix = lowerLine.replace(/^[\d\s\.]+/, '').trim();
      return withoutNumbersPrefix.startsWith(indicator);
    })) return false;
    
    // Skip lines that have too many words (likely instructions)
    if (lowerLine.split(' ').length > 10 && !lowerLine.includes(',')) return false;
    
    // Check for strong indicators of ingredients
    const hasUnit = units.some(unit => {
      const regex = new RegExp(`\\b${unit}\\b`, 'i');
      return regex.test(lowerLine);
    });
    const startsWithNumber = /^\d+[\d\/\.\s]*/.test(lowerLine);
    const hasBulletPoint = /^[-•*]/.test(lowerLine);
    
    return hasUnit || startsWithNumber || hasBulletPoint;
  });

  // Populate available ingredients dropdown for scaling
  const availableIngredientDropdown = document.getElementById("availableIngredient");
  if (availableIngredientDropdown) {
    availableIngredientDropdown.innerHTML = '';
    
    // Extract ingredient names without quantities
    ingredients.forEach((ingredient, index) => {
      const cleanedText = ingredient.replace(/^[-•*\s]+/, '').trim();
      const qtyRemoved = cleanedText.replace(/^[\d\s\/\.]+/, '').trim();
      const unitRemoved = units.reduce((text, unit) => {
        const regex = new RegExp(`\\b${unit}\\b`, 'i');
        return text.replace(regex, '');
      }, qtyRemoved).trim();
      
      const option = document.createElement('option');
      option.value = index;
      option.innerText = unitRemoved;
      availableIngredientDropdown.appendChild(option);
    });
  }

  const ingredientsList = document.getElementById("ingredientsList");
  if (ingredientsList) {
    ingredientsList.innerHTML = "";
    ingredients.forEach(ingredient => {
      // Remove emoji symbols, playback controls, and clean leading dashes/hyphens
      const cleanedIngredient = ingredient
        .replace(/[\u{1F000}-\u{1FFFF}]|[▶▷►▸▹▻➤➢➣➼]/gu, '')  // Remove emojis and playback controls
        .replace(/^[-•*\s]+/, '')                            // Remove leading bullet points or dashes
        .trim();
      
      // Skip ingredients that are just separators (like lots of dashes)
      if (/^[-*=]{5,}$/.test(cleanedIngredient)) return;
      
      const div = document.createElement("div");
      div.className = "ingredient-entry";
      div.innerHTML = `<input type="text" value="${cleanedIngredient}" readonly class="ingredient-name">`;
      ingredientsList.appendChild(div);
    });
  }
}

function addIngredient() {
  const ingredientsDiv = document.getElementById("recipeIngredientsList");
  if (ingredientsDiv) {
    const div = document.createElement("div");
    div.className = "ingredient-entry";
    div.innerHTML = `
      <input type="text" placeholder="Ingredient Name" class="ingredient-name">
      <input type="number" placeholder="Quantity" class="ingredient-quantity" min="0">
      <input type="text" placeholder="Unit (e.g., cups, tsp)" class="ingredient-unit">
    `;
    ingredientsDiv.appendChild(div);
  }
}

function scaleRecipe() {
  let fetchedIngredientsDiv = document.getElementById("ingredientsList");

  if (fetchedIngredientsDiv && fetchedIngredientsDiv.children.length > 0) {
    scaleFetchedIngredients();
    return;
  }

  let recipeName = document.getElementById("recipeName").value.trim();
  let mainIngredient = document.getElementById("mainIngredient").value.trim();
  let scalingOption = document.getElementById("scalingOption").value;
  let scalingValue = parseFloat(document.getElementById("scalingValue").value);

  if (!recipeName || !mainIngredient || isNaN(scalingValue) || scalingValue <= 0) {
    alert("Please enter valid recipe details and scaling value.");
    return;
  }

  let ingredients = document.querySelectorAll(".ingredient-entry");
  let ingredientData = [];

  let mainQuantity = 1;
  ingredients.forEach(ing => {
    let name = ing.querySelector(".ingredient-name").value.trim();
    let quantity = parseFloat(ing.querySelector(".ingredient-quantity").value);
    let unit = ing.querySelector(".ingredient-unit").value.trim();

    if (!name || isNaN(quantity) || quantity <= 0 || !unit) {
      alert("Please enter valid ingredient details.");
      return;
    }

    if (name.toLowerCase() === mainIngredient.toLowerCase()) {
      mainQuantity = quantity;
    }

    ingredientData.push({ name, quantity, unit });
  });

  let scaleFactor = scalingOption === "quantity" ? scalingValue / mainQuantity : scalingValue;

  let scaledIngredients = ingredientData.map(ing => {
    let newQuantity = (ing.quantity * scaleFactor).toFixed(2);
    return `${newQuantity} ${ing.unit} ${ing.name}`;
  });

  sessionStorage.setItem('recipeName', recipeName);
  sessionStorage.setItem('mainIngredient', `Main Ingredient: ${mainIngredient}`);
  sessionStorage.setItem('scaledIngredients', scaledIngredients.join("<br>"));
  sessionStorage.setItem('isManualRecipe', 'true');

  window.location.href = "scaled.html"; // ✅ Fixed: same tab to preserve sessionStorage
}

// Helper function to parse numbers, including simple fractions, mixed numbers, and ranges
function parseQuantity(qtyStr) {
  if (!qtyStr) return 1;
  
  // Standardize the input by removing double spaces and trimming
  qtyStr = qtyStr.replace(/\s+/g, ' ').trim();
  
  // Check if it's a range (e.g., "1-2" or "1 to 2")
  if (qtyStr.includes('-') || qtyStr.includes(' to ')) {
    // For ranges, take the average of the two values
    const range = qtyStr.includes('-') ? 
      qtyStr.split('-') : 
      qtyStr.split(' to ');
    
    if (range.length === 2) {
      const start = parseFloat(range[0].trim());
      const end = parseFloat(range[1].trim());
      if (!isNaN(start) && !isNaN(end)) {
        return (start + end) / 2; // Return average for scaling
      }
    }
  }
  
  // Handle mixed numbers like "2 1/2"
  if (qtyStr.includes(' ') && qtyStr.includes('/')) {
    const parts = qtyStr.split(' ');
    if (parts.length === 2) {
      const wholeNumber = parseFloat(parts[0]);
      // Check if the second part is a fraction
      if (parts[1].includes('/')) {
        const fractionParts = parts[1].split('/');
        if (fractionParts.length === 2) {
          const numerator = parseFloat(fractionParts[0]);
          const denominator = parseFloat(fractionParts[1]);
          if (!isNaN(wholeNumber) && !isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
            return wholeNumber + (numerator / denominator);
          }
        }
      }
    }
  }
  
  // Handle simple fractions
  if (qtyStr.includes('/')) {
    const parts = qtyStr.split('/');
    if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1])) && parseFloat(parts[1]) !== 0) {
      return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
  }
  
  const num = parseFloat(qtyStr);
  return isNaN(num) ? 1 : num;
}

function scaleFetchedIngredients() {
  let scalingValue = parseFloat(document.getElementById("scalingValue").value);

  if (isNaN(scalingValue) || scalingValue <= 0) {
    alert("Please enter a valid scaling value.");
    return;
  }

  // Get the YouTube video URL
  const youtubeLink = document.getElementById("youtubeLink").value;
  
  // Get the video title from the thumbnailContainer
  const titleElement = document.querySelector("#thumbnailContainer p");
  const videoTitle = titleElement ? titleElement.innerText : "Scaled Recipe";

  let ingredients = document.querySelectorAll("#ingredientsList .ingredient-entry");
  
  // Check if ingredients were properly loaded
  if (!ingredients || ingredients.length === 0) {
    alert("No ingredients found. Please try fetching the ingredients again.");
    return;
  }
  
  let ingredientData = [];

  ingredients.forEach(ing => {
    let fullIngredientText = ing.querySelector(".ingredient-name").value.trim();
    // Debugging
    console.log("Processing ingredient:", fullIngredientText);
    
    let originalQuantity = 1;
    let unit = '';
    let ingredientName = fullIngredientText;
    let isRange = false;
    let rangeText = '';

    // Try to extract quantity from the beginning, including mixed numbers like "2 1/4" and ranges
    // First try to match a range "1-2" or "1 to 2"
    const rangeMatch = fullIngredientText.match(/^([\d.\/]+\s*[-to]+\s*[\d.\/]+)(\s+|$)/i);
    // Then match a mixed number like "2 1/4"
    const mixedNumberMatch = fullIngredientText.match(/^(\d+\s+\d+\/\d+)(\s+|$)/);
    // Finally try to match a simple number or fraction
    const simpleNumberMatch = fullIngredientText.match(/^([\d.\/]+)(\s+|$)/);
    
    if (rangeMatch) {
      isRange = true;
      rangeText = rangeMatch[1];
      originalQuantity = parseQuantity(rangeText);
      // Remove the quantity part from the text
      ingredientName = fullIngredientText.substring(rangeMatch[0].length).trim();
    } else if (mixedNumberMatch) {
      // Handle mixed numbers
      originalQuantity = parseQuantity(mixedNumberMatch[1]);
      ingredientName = fullIngredientText.substring(mixedNumberMatch[0].length).trim();
      console.log(`Parsed mixed number: ${mixedNumberMatch[1]} -> ${originalQuantity}`);
    } else if (simpleNumberMatch) {
      originalQuantity = parseQuantity(simpleNumberMatch[1]);
      // Remove the quantity part from the text
      ingredientName = fullIngredientText.substring(simpleNumberMatch[0].length).trim();
    }

    // Extract unit from the remaining text
    const unitMatch = ingredientName.match(/\b(cup|cups|teaspoon|teaspoons|tablespoon|tablespoons|tbsp|tsp|gram|grams|kg|kilogram|kilograms|ounce|ounces|lb|pound|pounds|ml|milliliter|milliliters|liter|liters)\b/i);
    if (unitMatch) {
      unit = unitMatch[0];
      // Attempt to remove the unit from the name for cleaner output
      ingredientName = ingredientName.replace(unitMatch[0], '').replace(/\s+/g, ' ').trim();
    }

    // Special case: If the ingredient name starts with the unit, it might be something like "salt to taste"
    // or the quantity wasn't at the start. Revert name if it's empty after removing unit.
    if (!ingredientName && unit) {
        ingredientName = unit; // Or handle differently if needed
        unit = ''; // No standard unit in this case
    }

    ingredientData.push({ 
      name: ingredientName, 
      quantity: originalQuantity, 
      unit,
      isRange,
      rangeText
    });
  });

  let scaledIngredients = ingredientData.map(ing => {
    // Check if quantity is valid before scaling
    if (isNaN(ing.quantity)) {
        console.warn("Invalid quantity found for:", ing.name);
        return ing.name; // Return just the name if quantity is invalid
    }
    
    // Handle ranges specially
    if (ing.isRange && ing.rangeText) {
      // Parse the range and scale each number
      const rangeMatch = ing.rangeText.match(/([\d.\/]+)\s*[-to]+\s*([\d.\/]+)/i);
      if (rangeMatch && rangeMatch.length === 3) {
        const start = parseQuantity(rangeMatch[1]);
        const end = parseQuantity(rangeMatch[2]);
        
        // Scale both numbers
        const scaledStart = (start * scalingValue);
        const scaledEnd = (end * scalingValue);
        
        // Format the scaled range
        const formattedStart = formatQuantity(scaledStart);
        const formattedEnd = formatQuantity(scaledEnd);
        
        // Only add unit if it exists
        const unitString = ing.unit ? ` ${ing.unit}` : '';
        return `${formattedStart}-${formattedEnd}${unitString} ${ing.name}`;
      }
    }
    
    // Normal quantity scaling
    let newQuantity = (ing.quantity * scalingValue);
    let displayQuantity = formatQuantity(newQuantity);

    // Only add unit if it exists
    const unitString = ing.unit ? ` ${ing.unit}` : '';
    return `${displayQuantity}${unitString} ${ing.name}`;
  });

  // If something went wrong and we have no ingredients, show an error
  if (scaledIngredients.length === 0) {
    alert("Failed to scale ingredients. Please try again with a different video.");
    return;
  }

  // Make sure we have a valid title (using the existing titleElement from above)
  const finalTitle = (titleElement && titleElement.innerText) ? 
                     titleElement.innerText : 
                     (videoTitle || "Scaled Recipe");

  // Store the results in session storage for the scaled page
  sessionStorage.setItem('recipeName', finalTitle);
  sessionStorage.setItem('mainIngredient', '');
  sessionStorage.setItem('scaledIngredients', scaledIngredients.join("<br>"));
  sessionStorage.setItem('youtubeVideoUrl', youtubeLink);
  sessionStorage.setItem('isManualRecipe', 'false');

  window.location.href = "scaled.html";
}

// Helper function to format quantities nicely
function formatQuantity(quantity) {
  // Handle common fractions directly
  if (quantity === 0.5) return "1/2";
  if (quantity === 0.25) return "1/4";
  if (quantity === 0.75) return "3/4";
  if (Math.abs(quantity - 0.33) < 0.01) return "1/3";
  if (Math.abs(quantity - 0.67) < 0.01) return "2/3";
  
  // Basic fraction conversion for mixed numbers
  if (quantity > 1) {
    if (quantity % 1 === 0.5) return `${Math.floor(quantity)} 1/2`;
    if (quantity % 1 === 0.25) return `${Math.floor(quantity)} 1/4`;
    if (quantity % 1 === 0.75) return `${Math.floor(quantity)} 3/4`;
    if (Math.abs(quantity % 1 - 0.33) < 0.01) return `${Math.floor(quantity)} 1/3`;
    if (Math.abs(quantity % 1 - 0.67) < 0.01) return `${Math.floor(quantity)} 2/3`;
  }
  
  // For whole numbers, don't show decimal places
  if (quantity % 1 === 0) return quantity.toString();
  
  // For values less than 1, remove the leading zero
  if (quantity < 1) return quantity.toFixed(2).replace(/^0\./, "").replace(/0+$/, "").replace(/\.$/, "");
  
  // Otherwise format with 1 decimal place, remove trailing zeros
  return quantity.toFixed(2).replace(/\.0+$/, "").replace(/(\.\d+?)0+$/, "$1");
}

// Update scaling options based on selected scaling method
function updateScalingOptions() {
  const scalingOption = document.getElementById("scalingOption").value;
  
  // Hide all scaling methods first
  document.querySelectorAll('.scaling-method').forEach(el => {
    el.style.display = 'none';
  });
  
  // Show the selected scaling method
  switch(scalingOption) {
    case 'servings':
    case 'quantity':
      document.getElementById('standard-scaling').style.display = 'block';
      break;
    case 'available':
      document.getElementById('available-scaling').style.display = 'block';
      break;
    case 'custom':
      document.getElementById('custom-scaling').style.display = 'block';
      break;
  }
}

// Save recipe to local storage
function saveRecipe() {
  const recipeName = document.getElementById('recipeName').innerText;
  const mainIngredient = document.getElementById('mainIngredient').innerText;
  const ingredients = [];
  
  // Get ingredients from the list
  const ingredientItems = document.querySelectorAll('#scaledIngredients li');
  ingredientItems.forEach(item => {
    ingredients.push(item.innerText);
  });
  
  // Get YouTube link if available
  const youtubeLink = sessionStorage.getItem('youtubeVideoUrl') || '';
  
  const recipe = {
    id: Date.now().toString(),
    name: recipeName,
    mainIngredient,
    ingredients,
    youtubeLink,
    savedDate: new Date().toISOString()
  };
  
  // Get existing recipes from localStorage
  let savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
  
  // Add new recipe
  savedRecipes.push(recipe);
  
  // Save back to localStorage
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
  
  alert('Recipe saved successfully!');
}

// Load saved recipes
function loadSavedRecipes() {
  const savedRecipesContainer = document.getElementById('saved-recipes');
  const savedRecipesList = document.getElementById('saved-recipes-list');
  
  if (!savedRecipesContainer || !savedRecipesList) return;
  
  // Get recipes from localStorage
  const savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
  
  if (savedRecipes.length === 0) {
    savedRecipesContainer.style.display = 'none';
    return;
  }
  
  savedRecipesContainer.style.display = 'block';
  savedRecipesList.innerHTML = '';
  
  // Display each saved recipe
  savedRecipes.forEach(recipe => {
    const item = document.createElement('div');
    item.className = 'saved-recipe-item';
    item.innerHTML = `
      <h3>${recipe.name}</h3>
      <p>${recipe.ingredients.length} ingredients</p>
      <div class="saved-recipe-actions">
        <button onclick="loadRecipe('${recipe.id}')"><i class="fas fa-eye"></i></button>
        <button onclick="deleteRecipe('${recipe.id}')"><i class="fas fa-trash"></i></button>
      </div>
    `;
    savedRecipesList.appendChild(item);
  });
}

// Load a specific recipe
function loadRecipe(recipeId) {
  const savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
  const recipe = savedRecipes.find(r => r.id === recipeId);
  
  if (recipe) {
    sessionStorage.setItem('recipeName', recipe.name);
    sessionStorage.setItem('mainIngredient', recipe.mainIngredient);
    sessionStorage.setItem('scaledIngredients', recipe.ingredients.join('<br>'));
    
    if (recipe.youtubeLink) {
      sessionStorage.setItem('youtubeVideoUrl', recipe.youtubeLink);
    }
    
    window.location.href = 'scaled.html';
  }
}

// Delete a recipe
function deleteRecipe(recipeId) {
  if (confirm('Are you sure you want to delete this recipe?')) {
    let savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
    savedRecipes = savedRecipes.filter(r => r.id !== recipeId);
    localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
    loadSavedRecipes();
  }
}

// Print recipe
function printRecipe() {
  window.print();
}

// Export recipe as PDF
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const recipeName = document.getElementById('recipeName').innerText;
  const mainIngredient = document.getElementById('mainIngredient').innerText;
  const ingredients = [];
  
  // Get ingredients from the list
  const ingredientItems = document.querySelectorAll('#scaledIngredients li');
  ingredientItems.forEach(item => {
    ingredients.push(item.innerText);
  });
  
  // Add content to PDF
  doc.setFontSize(18);
  doc.text(recipeName, 20, 20);
  
  doc.setFontSize(12);
  doc.text(mainIngredient, 20, 30);
  
  doc.setFontSize(14);
  doc.text('Ingredients:', 20, 40);
  
  let y = 50;
  ingredients.forEach(ingredient => {
    doc.setFontSize(12);
    doc.text('• ' + ingredient, 25, y);
    y += 10;
    
    // Add new page if needed
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });
  
  // Save the PDF
  doc.save(`${recipeName.replace(/\s+/g, '_')}.pdf`);
}

// Export recipe as text
function exportText() {
  const recipeName = document.getElementById('recipeName').innerText;
  const mainIngredient = document.getElementById('mainIngredient').innerText;
  const ingredients = [];
  
  // Get ingredients from the list
  const ingredientItems = document.querySelectorAll('#scaledIngredients li');
  ingredientItems.forEach(item => {
    ingredients.push(item.innerText);
  });
  
  // Create text content
  let content = `${recipeName}\n\n`;
  content += `${mainIngredient}\n\n`;
  content += `Ingredients:\n`;
  ingredients.forEach(ingredient => {
    content += `- ${ingredient}\n`;
  });
  
  // Create a download link
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', `${recipeName.replace(/\s+/g, '_')}.txt`);
  element.style.display = 'none';
  
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// Send recipe via email
function emailRecipe() {
  const recipeName = document.getElementById('recipeName').innerText;
  const mainIngredient = document.getElementById('mainIngredient').innerText;
  const ingredients = [];
  
  // Get ingredients from the list
  const ingredientItems = document.querySelectorAll('#scaledIngredients li');
  ingredientItems.forEach(item => {
    ingredients.push(item.innerText);
  });
  
  // Create email body
  let body = `${recipeName}%0D%0A%0D%0A`;
  body += `${mainIngredient}%0D%0A%0D%0A`;
  body += `Ingredients:%0D%0A`;
  ingredients.forEach(ingredient => {
    body += `- ${ingredient}%0D%0A`;
  });
  
  // Open email client
  window.location.href = `mailto:?subject=Recipe: ${recipeName}&body=${body}`;
}

// YouTube search functionality
let nextPageToken = '';
let prevPageToken = '';
let currentQuery = '';
let currentCategory = '';

function searchYouTube(pageToken = '') {
  showLoading();
  
  const query = document.getElementById('searchQuery').value;
  const category = document.getElementById('recipeCategory').value;
  
  // Save current search parameters
  currentQuery = query;
  currentCategory = category;
  
  if (!query) {
    hideLoading();
    alert('Please enter a search term');
    return;
  }
  
  // Create search query with recipe related terms and ingredients keywords
  let searchTerm = query;
  if (category) {
    searchTerm += ` ${category} recipe`;
  } else {
    searchTerm += ' recipe';
  }
  
  // Add terms to increase chances of finding videos with ingredients
  searchTerm += ' ingredients';
  
  // Max results per page - request more than we show to account for filtering
  const maxResults = 15;
  
  // Build API URL
  // Use videoDefinition=high to prefer higher quality videos (typically not shorts)
  // Use videoDuration=medium to exclude very short videos (shorts are often < 1 minute)
  let apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDefinition=high&videoDuration=medium&maxResults=${maxResults}&q=${encodeURIComponent(searchTerm)}&key=${API_KEY}`;
  
  // Add page token if provided
  if (pageToken) {
    apiUrl += `&pageToken=${pageToken}`;
  }
  
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      // Store pagination tokens
      nextPageToken = data.nextPageToken || '';
      prevPageToken = data.prevPageToken || '';
      
      if (!data.items || data.items.length === 0) {
        displaySearchResults({ items: [] }, { items: [] });
        createPagination();
        hideLoading();
        return;
      }
      
      // Get video details (for view count and descriptions)
      const videoIds = data.items.map(item => item.id.videoId).join(',');
      return fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${API_KEY}`)
        .then(response => response.json())
        .then(videoData => {
          // Filter videos to exclude shorts and prefer videos with ingredients
          const filteredItems = filterSearchResults(data.items, videoData.items);
          
          // Update search results with filtered items
          const filteredResults = {
            ...data,
            items: filteredItems.slice(0, 6) // Limit to 6 results for display
          };
          
          // Combine search results with video statistics
          return {
            searchResults: filteredResults,
            videoDetails: videoData
          };
        });
    })
    .then(({ searchResults, videoDetails }) => {
      displaySearchResults(searchResults, videoDetails);
      createPagination();
      hideLoading();
    })
    .catch(error => {
      console.error('Error searching YouTube:', error);
      hideLoading();
      alert('Error searching YouTube. Please try again.');
    });
}

// Filter search results to exclude shorts and prefer videos with ingredients in description
function filterSearchResults(searchItems, videoItems) {
  if (!videoItems || videoItems.length === 0) return [];
  
  // Keywords that suggest a video description might contain ingredients
  const ingredientKeywords = [
    'ingredient', 'ingredients', 'recipe', 'cup', 'tablespoon', 'teaspoon', 
    'gram', 'oz', 'pound', 'ml', 'liter', 'kg'
  ];
  
  // Score and rank videos
  const scoredVideos = searchItems.map(searchItem => {
    const videoId = searchItem.id.videoId;
    const videoDetail = videoItems.find(v => v.id === videoId);
    
    if (!videoDetail) return { searchItem, score: 0 };
    
    // Check if it's not a short video
    const isShort = isYoutubeShort(videoDetail);
    if (isShort) return { searchItem, score: -100 }; // Give shorts a very low score
    
    let score = 0;
    
    // Check description for ingredient-related keywords
    const description = videoDetail.snippet.description.toLowerCase();
    
    ingredientKeywords.forEach(keyword => {
      if (description.includes(keyword)) {
        score += 5;
      }
    });
    
    // Check if description likely contains ingredient list (lines with measurements)
    const lines = description.split('\n');
    const potentialIngredientLines = lines.filter(line => {
      // Look for lines that might be ingredients
      const hasNumbers = /\d+/.test(line);
      const hasUnits = /(cup|tbsp|tsp|tablespoon|teaspoon|gram|g|oz|pound|lb|ml|l)s?\b/i.test(line);
      return hasNumbers && hasUnits;
    });
    
    // Boost score based on potential ingredient lines
    score += potentialIngredientLines.length * 3;
    
    // Longer videos are preferred (less likely to be shorts)
    const duration = videoDetail.contentDetails.duration;
    const durationInSeconds = parseDuration(duration);
    
    if (durationInSeconds > 180) score += 10; // Prefer videos > 3 minutes
    if (durationInSeconds < 90) score -= 5;  // Penalize very short videos
    
    return { searchItem, score };
  });
  
  // Sort by score (highest first) and return the search items
  return scoredVideos
    .sort((a, b) => b.score - a.score)
    .map(item => item.searchItem);
}

// Helper function to check if a video is a YouTube Short
function isYoutubeShort(videoDetail) {
  if (!videoDetail) return false;
  
  // Check if title contains #shorts
  const hasShortHashtag = videoDetail.snippet.title.toLowerCase().includes('#short');
  
  // Check aspect ratio (shorts are typically vertical)
  // YouTube doesn't expose aspect ratio directly, but shorts are typically < 60 seconds
  const duration = videoDetail.contentDetails.duration;
  const durationInSeconds = parseDuration(duration);
  const isShortDuration = durationInSeconds < 60;
  
  // Check description for shorts indicators
  const description = videoDetail.snippet.description.toLowerCase();
  const hasShortInDescription = description.includes('#short');
  
  return (hasShortHashtag || hasShortInDescription || (isShortDuration && (hasShortHashtag || hasShortInDescription)));
}

// Parse ISO 8601 duration format (PT1H2M3S) to seconds
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

function displaySearchResults(searchResults, videoDetails) {
  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = '';
  
  // Create grid container
  const resultsGrid = document.createElement('div');
  resultsGrid.className = 'search-results';
  
  if (!searchResults.items || searchResults.items.length === 0) {
    resultsContainer.innerHTML = '<p>No results found. Try a different search term.</p>';
    return;
  }
  
  searchResults.items.forEach(item => {
    // Get video details including view count
    const videoId = item.id.videoId;
    const videoDetail = videoDetails.items.find(video => video.id === videoId);
    const viewCount = videoDetail ? formatViewCount(videoDetail.statistics.viewCount) : 'N/A';
    
    // Create result card
    const resultCard = document.createElement('div');
    resultCard.className = 'search-result-item';
    
    // Format the video published date
    const publishedDate = new Date(item.snippet.publishedAt);
    const formattedDate = publishedDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    // Get the highest resolution thumbnail available
    const thumbnail = item.snippet.thumbnails.high || item.snippet.thumbnails.medium || item.snippet.thumbnails.default;
    
    resultCard.innerHTML = `
      <img src="${thumbnail.url}" alt="${item.snippet.title}" class="search-result-thumb">
      <div class="search-result-info">
        <h3 class="search-result-title">${item.snippet.title}</h3>
        <div class="search-result-channel">${item.snippet.channelTitle}</div>
        <div class="search-result-views">${viewCount} views • ${formattedDate}</div>
        <div class="search-result-buttons">
          <button onclick="useVideo('https://www.youtube.com/watch?v=${videoId}')" class="search-result-button">Use This Recipe</button>
          <button onclick="window.open('https://www.youtube.com/watch?v=${videoId}', '_blank')" class="search-result-button">Watch</button>
        </div>
      </div>
    `;
    
    resultsGrid.appendChild(resultCard);
  });
  
  resultsContainer.appendChild(resultsGrid);
}

function createPagination() {
  const paginationContainer = document.getElementById('pagination');
  paginationContainer.innerHTML = '';
  
  if (prevPageToken) {
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button';
    prevButton.innerHTML = '&laquo; Previous';
    prevButton.onclick = () => searchYouTube(prevPageToken);
    paginationContainer.appendChild(prevButton);
  }
  
  if (nextPageToken) {
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button';
    nextButton.innerHTML = 'Next &raquo;';
    nextButton.onclick = () => searchYouTube(nextPageToken);
    paginationContainer.appendChild(nextButton);
  }
}

function formatViewCount(viewCount) {
  const count = parseInt(viewCount);
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function useVideo(videoUrl) {
  document.getElementById('youtubeLink').value = videoUrl;
  
  // Switch to direct link tab
  document.querySelectorAll('.search-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  document.querySelector('[data-tab="direct-link"]').classList.add('active');
  document.getElementById('direct-link').classList.add('active');
  
  // Clear any previous ingredients and thumbnails
  document.getElementById('thumbnailContainer').innerHTML = '';
  document.getElementById('ingredientsList').innerHTML = '';
  
  // Fetch ingredients automatically
  fetchIngredients();
}
