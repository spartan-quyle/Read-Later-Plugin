import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
import numpy as np

def create_logo_variant(filename, draw_func):
    # Giữ nguyên thiết lập canvas như cũ để đảm bảo nền trong suốt
    fig, ax = plt.subplots(figsize=(5, 5), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.set_aspect('equal')
    ax.axis('off')
    
    draw_func(ax)
    
    # Save with transparent background
    plt.savefig(filename, transparent=True, bbox_inches='tight', pad_inches=0)
    plt.close()

def design_1_redesigned(ax):
    # === RE-DESIGN CONCEPT: THE FRAGMENTED FOLD ===
    # Phong cách: Modern Architectural / Abstract Minimalist.
    # Thay vì vẽ một đường line để chỉ nếp gấp, ta dùng "không gian âm" (negative space).
    # Ta chia bookmark thành 2 khối hình học riêng biệt. 
    # Khoảng hở giữa chúng tạo cảm giác về nếp gấp một cách trừu tượng.
    
    # Màu sắc chủ đạo: Dark Charcoal (Than chì đậm) - Sang trọng, hiện đại.
    main_color = '#2D3436' 
    
    # --- Khối 1: Thân chính của Bookmark (Phần dưới bên trái) ---
    # Nó giữ lại phần đuôi chữ V đặc trưng, nhưng bị cắt vát ở góc trên bên phải.
    body_points = np.array([
        [30, 85],  # Đỉnh trên trái cao hơn một chút
        [30, 20],  # Đáy trái
        [50, 40],  # Điểm giữa chữ V
        [70, 20],  # Đáy phải
        [70, 55],  # Điểm bắt đầu đường cắt vát bên phải
        [52, 85]   # Điểm kết thúc đường cắt vát trên cùng
    ])
    body_poly = Polygon(body_points, closed=True, fc=main_color, ec='none', antialiased=True)
    ax.add_patch(body_poly)
    
    # --- Khối 2: Phần "nếp gấp" (Góc trên bên phải) ---
    # Một tam giác nhỏ nằm tách biệt, gợi ý phần góc trang sách được gấp lại.
    # Nó nằm song song với đường cắt của khối thân chính.
    fold_points = np.array([
        [58, 85],  # Góc trái của nếp gấp
        [75, 85],  # Góc phải trên cùng
        [75, 62]   # Góc dưới của nếp gấp
    ])
    # Ta có thể dùng cùng màu hoặc màu nhạt hơn một chút để tạo chiều sâu.
    # Ở đây dùng cùng màu để tối đa sự tối giản.
    fold_poly = Polygon(fold_points, closed=True, fc=main_color, ec='none', antialiased=True)
    ax.add_patch(fold_poly)

# Tạo logo với thiết kế mới
create_logo_variant('logo_architectural_redesigned.png', design_1_redesigned)

print("Đã tạo xong logo re-design theo phương án 1: logo_architectural_redesigned.png")
