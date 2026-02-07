import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Circle
import numpy as np

def create_logo_variant(filename, draw_func):
    # Canvas setup
    # Canvas setup - FORCE FULL BLEED
    # Create a figure
    fig = plt.figure(figsize=(5, 5), dpi=300)
    
    # Add an axes that covers the entire figure (0,0 to 1,1 in fraction coordinates)
    ax = fig.add_axes([0, 0, 1, 1])
    
    # We will set the limits later based on the content to ensure it touches edges
    # For now, we assume the content is centered at 50,50 with some radius.
    # The drawing functions below are designed for a 100x100 canvas concept.
    # We will force the limits to match the background circle exactly.
    
    # Let the draw function do its work
    draw_func(ax)
    
    # Save WITHOUT bbox_inches='tight' to respect our valid [0,0,1,1] layout.
    # This ensures the image is exactly the size of the figure, with NO padding.
    plt.savefig(filename, transparent=True)
    plt.close()

def design_with_background(ax):
    # Background options
    # Blue: #3498db, Purple: #9b59b6, Bright Blue: #007AFF
    # Choosing a Vibrant Purple/Blue mix or just Blue as requested.
    # User asked for "Blue or Purple". Let's use a nice Purple-Blue.
    bg_color = '#69F0AE' # Bright Mint
    bg_color = '#1B263B' # Navy
    
    # 1. Background Circle
    center = (50, 50)
    radius = 69
    
    # We want the limits to exactly match the circle's bounding box
    # So x: [50-69, 50+69], y: [50-69, 50+69]
    ax.set_xlim(center[0]-radius, center[0]+radius)
    ax.set_ylim(center[1]-radius, center[1]+radius)
    ax.axis('off')
    
    circle = Circle(center, radius, fc=bg_color, ec='none', antialiased=True)
    ax.add_patch(circle)
    
    # 2. The Bookmark (Scaled and Centered)
    # Original coords were roughly 30-70 x, 20-85 y. 
    # Center of original bookmark: x=50, y=52.5 roughly.
    # Code reused from previous script, but we might need to scale it down slightly to breathe in the circle.
    
    # Scaling factor to fit comfortably in circle
    scale = 1.3
    center_shift_x = 50 * (1 - scale)
    center_shift_y = 50 * (1 - scale) 
    
    # Color for the bookmark: Dark/Black for contrast against bright background
    mark_color = '#212121' # Almost black
    mark_color = '#D4A017' # Warm Yellow
    
    # Original Bookmark Points
    body_points = np.array([
        [30, 85], [30, 20], [50, 40], [70, 20], [70, 55], [52, 85]
    ])
    
    # Transform points: Scale relative to (50, 50) then translate? 
    # Or just multiply and shift. 
    # Proper formatting: New = (Old - Center) * Scale + Center
    # Old Center approx (50, 50) is fine for simplified math
    centroid = np.array([50, 50])
    
    body_points_transformed = (body_points - centroid) * scale + centroid
    
    body_poly = Polygon(body_points_transformed, closed=True, fc=mark_color, ec='none', antialiased=True)
    ax.add_patch(body_poly)
    
    # Fold Points
    fold_points = np.array([
        [58, 85], [75, 85], [75, 62]
    ])
    fold_points_transformed = (fold_points - centroid) * scale + centroid
    
    # We can make the fold slightly lighter or White to really pop?
    # Or keep it same color negative space? 
    # Previous design was "fragmented fold" - pieces were separate.
    # Let's keep it consistent: Same color as body, or maybe slightly lighter?
    # Just same color is fine for flat design.
    fold_poly = Polygon(fold_points_transformed, closed=True, fc=mark_color, ec='none', antialiased=True)
    ax.add_patch(fold_poly)

# Create the logo
create_logo_variant('icon_bg_purple.png', design_with_background)
print("Created icon_bg_purple.png")
