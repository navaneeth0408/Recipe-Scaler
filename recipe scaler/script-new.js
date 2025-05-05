document.addEventListener('DOMContentLoaded', function () {
  let recipeName = sessionStorage.getItem('recipeName');
  let mainIngredient = sessionStorage.getItem('mainIngredient');
  let scaledIngredients = sessionStorage.getItem('scaledIngredients');
  let youtubeVideoUrl = sessionStorage.getItem('youtubeVideoUrl');
  let isManualRecipe = sessionStorage.getItem('isManualRecipe');

  if (recipeName && scaledIngredients) {
    document.getElementById('recipeName').innerText = recipeName;
    document.getElementById('mainIngredient').innerText = mainIngredient;

    const lines = scaledIngredients.split('<br>').filter(Boolean);
    const ul = document.getElementById('scaledIngredients');
    ul.innerHTML = '';
    lines.forEach(line => {
      // Skip lines that are just separators (like lots of dashes)
      if (/^[-*=]{5,}$/.test(line.trim())) return;
      
      const li = document.createElement('li');
      // Clean any remaining dash prefixes that might have been preserved
      const cleanedLine = line.replace(/^\s*-\s+/, '').trim();
      li.textContent = cleanedLine;
      ul.appendChild(li);
    });

    // Add YouTube video link only if it's not a manually entered recipe
    if (youtubeVideoUrl && isManualRecipe !== 'true') {
      const sourceDiv = document.createElement('div');
      sourceDiv.className = 'video-source';
      sourceDiv.innerHTML = `
        <p>Original Recipe: 
          <a href="${youtubeVideoUrl}" target="_blank">Watch on YouTube</a>
        </p>
      `;
      
      // Insert after main ingredient
      const mainIngredientElement = document.getElementById('mainIngredient');
      if (mainIngredientElement.nextSibling) {
        mainIngredientElement.parentNode.insertBefore(sourceDiv, mainIngredientElement.nextSibling);
      } else {
        mainIngredientElement.parentNode.appendChild(sourceDiv);
      }
    }
  } else {
    document.getElementById('recipeName').innerText = "No Recipe";
    document.getElementById('mainIngredient').innerText = "N/A";
    document.getElementById('scaledIngredients').innerHTML = '<li>No scaled recipe found. Please return to the main page and scale your recipe again.</li>';
  }
});

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

// Return to the scaling UI with current recipe data
function modifyScaling() {
  // Store current recipe state in sessionStorage with a special flag
  sessionStorage.setItem('modifyingRecipe', 'true');
  // The other data (recipeName, scaledIngredients, youtubeVideoUrl) is already in sessionStorage
  
  // Navigate back to the main page
  window.location.href = 'index.html';
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
