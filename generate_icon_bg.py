import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Circle
import numpy as np

def create_logo_variant(filename, draw_func):
    # Canvas setup
    fig, ax = plt.subplots(figsize=(5, 5), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.set_aspect('equal')
    ax.axis('off')
    
    draw_func(ax)
    
    # Save with transparent background
    plt.savefig(filename, transparent=True, bbox_inches='tight', pad_inches=0)
    plt.close()

def design_with_background(ax):
    # Background options
    # Blue: #3498db, Purple: #9b59b6, Bright Blue: #007AFF
    # Choosing a Vibrant Purple/Blue mix or just Blue as requested.
    # User asked for "Blue or Purple". Let's use a nice Purple-Blue.
    bg_color = '#6c5ce7' # Vibrant Purple-Blue
    
    # 1. Background Circle
    # Center at 50, 50. Radius approx 48 to fit cleanly.
    circle = Circle((50, 50), 48, fc=bg_color, ec='none', antialiased=True)
    ax.add_patch(circle)
    
    # 2. The Bookmark (Scaled and Centered)
    # Original coords were roughly 30-70 x, 20-85 y. 
    # Center of original bookmark: x=50, y=52.5 roughly.
    # Code reused from previous script, but we might need to scale it down slightly to breathe in the circle.
    
    # Scaling factor 0.7 to fit comfortably in circle
    scale = 0.9
    center_shift_x = 50 * (1 - scale)
    center_shift_y = 50 * (1 - scale) 
    
    # Color for the bookmark: Dark/Black for contrast against bright background
    mark_color = '#1e1e1e' # Almost black
    
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
