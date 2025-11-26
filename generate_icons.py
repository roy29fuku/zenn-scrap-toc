#!/usr/bin/env python3
"""
Simple icon generator using PIL to create PNG icons from a base design.
If cairosvg is not available, creates simple placeholder icons.
"""

import os
from PIL import Image, ImageDraw

def create_icon(size):
    """Create a simple icon with the specified size."""
    # Create a new image with a blue background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background with rounded corners
    corner_radius = size // 6
    draw.rounded_rectangle(
        [(0, 0), (size, size)],
        radius=corner_radius,
        fill=(62, 168, 255, 255)  # #3EA8FF
    )

    # Draw TOC lines
    white = (255, 255, 255, 255)
    line_height = size // 16
    spacing = size // 8
    left_margin = size // 6
    right_margin = size // 6

    # Calculate positions
    y_positions = [
        size // 4,      # H1
        size // 2.5,    # H2
        size // 2,      # H2
        size // 1.6,    # H3
        size // 1.25,   # H1
    ]

    line_widths = [
        size // 2.2,    # H1
        size // 3,      # H2
        size // 3,      # H2
        size // 4,      # H3
        size // 2.2,    # H1
    ]

    indents = [
        0,              # H1
        size // 10,     # H2
        size // 10,     # H2
        size // 5,      # H3
        0,              # H1
    ]

    for i, (y, width, indent) in enumerate(zip(y_positions, line_widths, indents)):
        # Draw line
        x1 = left_margin + indent
        x2 = x1 + width
        y1 = y - line_height // 2
        y2 = y + line_height // 2

        # Draw rounded rectangle for line
        draw.rounded_rectangle(
            [(x1, y1), (x2, y2)],
            radius=line_height // 2,
            fill=white
        )

        # Draw circle (bullet point)
        circle_size = line_height if i in [0, 4] else line_height * 0.8
        circle_x = size - right_margin - circle_size // 2
        circle_y = y
        draw.ellipse(
            [
                (circle_x - circle_size // 2, circle_y - circle_size // 2),
                (circle_x + circle_size // 2, circle_y + circle_size // 2)
            ],
            fill=white
        )

    return img

def main():
    sizes = [16, 32, 48, 128]
    icons_dir = 'icons'

    # Ensure icons directory exists
    os.makedirs(icons_dir, exist_ok=True)

    for size in sizes:
        icon = create_icon(size)
        output_path = os.path.join(icons_dir, f'icon{size}.png')
        icon.save(output_path)
        print(f'Created {output_path}')

if __name__ == '__main__':
    main()