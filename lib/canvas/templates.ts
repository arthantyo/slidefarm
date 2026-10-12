import { nanoid } from 'nanoid';
import type { Slide, Project, Theme, Template, SlideType, CanvasElement } from '@/types';
import { createTextElement, createShapeElement, createBackgroundElement } from './element-factory';
import { DEFAULT_THEMES } from './themes';

// ─── Slide Layout Builders ───────────────────────────────────────────────────

function buildCoverSlide(width: number, height: number, theme: Theme, title: string, subtitle: string): Slide {
  const elements: CanvasElement[] = [
    createBackgroundElement({
      width, height,
      fill: theme.background,
      fillType: 'gradient',
      gradientColor2: theme.primary,
      gradientAngle: 135,
    }),
    createShapeElement({
      x: width * 0.08, y: height * 0.06,
      width: 60, height: 6,
      shape: 'rect',
      fill: theme.accent,
      cornerRadius: 3,
      name: 'Accent Bar',
    }),
    createTextElement({
      x: width * 0.08, y: height * 0.12,
      width: width * 0.84,
      height: height * 0.4,
      text: title,
      fontSize: Math.round(width * 0.09),
      fontFamily: theme.fontHeading,
      fontStyle: 'bold',
      fill: theme.text,
      align: 'left',
      verticalAlign: 'middle',
      lineHeight: 1.1,
      name: 'Title',
    }),
    createTextElement({
      x: width * 0.08, y: height * 0.56,
      width: width * 0.84,
      height: height * 0.12,
      text: subtitle,
      fontSize: Math.round(width * 0.03),
      fontFamily: theme.fontBody,
      fill: theme.textMuted,
      align: 'left',
      verticalAlign: 'top',
      name: 'Subtitle',
    }),
  ];
  return { id: nanoid(10), type: 'cover', name: 'Cover', elements };
}

function buildTextSlide(width: number, height: number, theme: Theme, headline: string, body: string): Slide {
  const elements: CanvasElement[] = [
    createBackgroundElement({ width, height, fill: theme.background }),
    createTextElement({
      x: width * 0.08, y: height * 0.1,
      width: width * 0.84,
      height: height * 0.2,
      text: headline,
      fontSize: Math.round(width * 0.055),
      fontFamily: theme.fontHeading,
      fontStyle: 'bold',
      fill: theme.primary,
      align: 'left',
      verticalAlign: 'top',
      lineHeight: 1.2,
      name: 'Headline',
    }),
    createTextElement({
      x: width * 0.08, y: height * 0.32,
      width: width * 0.84,
      height: height * 0.5,
      text: body,
      fontSize: Math.round(width * 0.03),
      fontFamily: theme.fontBody,
      fill: theme.text,
      align: 'left',
      verticalAlign: 'top',
      lineHeight: 1.5,
      name: 'Body',
    }),
  ];
  return { id: nanoid(10), type: 'text-focused', name: 'Text', elements };
}

function buildListSlide(
  width: number, height: number, theme: Theme,
  headline: string, items: string[],
): Slide {
  const elements: CanvasElement[] = [
    createBackgroundElement({ width, height, fill: theme.background }),
    createTextElement({
      x: width * 0.08, y: height * 0.06,
      width: width * 0.84,
      height: height * 0.12,
      text: headline,
      fontSize: Math.round(width * 0.05),
      fontFamily: theme.fontHeading,
      fontStyle: 'bold',
      fill: theme.primary,
      align: 'left',
      verticalAlign: 'top',
      name: 'Headline',
    }),
  ];

  const listHeight = height * 0.76;
  const itemSpacing = listHeight / Math.max(items.length, 1);
  const itemHeight = Math.min(itemSpacing * 0.85, height * 0.12);
  const startY = height * 0.2;

  items.forEach((item, i) => {
    const y = startY + i * itemSpacing;
    elements.push(
      createShapeElement({
        x: width * 0.08, y: y + itemHeight * 0.3,
        width: Math.round(width * 0.07),
        height: Math.round(width * 0.07),
        shape: 'ellipse',
        fill: theme.accent,
        name: `Number ${i + 1}`,
      }),
    );
    elements.push(
      createTextElement({
        x: width * 0.08 + Math.round(width * 0.07) / 2,
        y: y + itemHeight * 0.3,
        width: Math.round(width * 0.07),
        height: Math.round(width * 0.07),
        text: String(i + 1),
        fontSize: Math.round(width * 0.028),
        fontFamily: theme.fontBody,
        fontStyle: 'bold',
        fill: '#ffffff',
        align: 'center',
        verticalAlign: 'middle',
        name: `Num Text ${i + 1}`,
      }),
    );
    elements.push(
      createTextElement({
        x: width * 0.2, y,
        width: width * 0.72,
        height: itemHeight,
        text: item,
        fontSize: Math.round(width * 0.032),
        fontFamily: theme.fontBody,
        fill: theme.text,
        align: 'left',
        verticalAlign: 'middle',
        lineHeight: 1.4,
        name: `Item ${i + 1}`,
      }),
    );
  });

  return { id: nanoid(10), type: 'numbered-list', name: 'List', elements };
}

function buildQuoteSlide(width: number, height: number, theme: Theme, quote: string, author: string): Slide {
  const elements: CanvasElement[] = [
    createBackgroundElement({
      width, height,
      fill: theme.primary,
      fillType: 'gradient',
      gradientColor2: theme.secondary,
      gradientAngle: 160,
    }),
    createTextElement({
      x: width * 0.1, y: height * 0.15,
      width: width * 0.8,
      height: height * 0.08,
      text: '"',
      fontSize: Math.round(width * 0.2),
      fontFamily: theme.fontHeading,
      fontStyle: 'bold',
      fill: theme.accent,
      align: 'left',
      verticalAlign: 'top',
      name: 'Quote Mark',
    }),
    createTextElement({
      x: width * 0.1, y: height * 0.28,
      width: width * 0.8,
      height: height * 0.36,
      text: quote,
      fontSize: Math.round(width * 0.045),
      fontFamily: theme.fontHeading,
      fontStyle: 'italic',
      fill: '#ffffff',
      align: 'left',
      verticalAlign: 'top',
      lineHeight: 1.4,
      name: 'Quote',
    }),
    createTextElement({
      x: width * 0.1, y: height * 0.68,
      width: width * 0.8,
      height: height * 0.08,
      text: `— ${author}`,
      fontSize: Math.round(width * 0.028),
      fontFamily: theme.fontBody,
      fill: theme.accent,
      align: 'left',
      verticalAlign: 'top',
      name: 'Author',
    }),
  ];
  return { id: nanoid(10), type: 'quote', name: 'Quote', elements };
}

function buildCTASlide(width: number, height: number, theme: Theme, headline: string, cta: string): Slide {
  const ctaWidth = width * 0.5;
  const ctaHeight = height * 0.08;
  const elements: CanvasElement[] = [
    createBackgroundElement({
      width, height,
      fill: theme.background,
      fillType: 'gradient',
      gradientColor2: theme.secondary,
      gradientAngle: 135,
    }),
    createTextElement({
      x: width * 0.08, y: height * 0.2,
      width: width * 0.84,
      height: height * 0.3,
      text: headline,
      fontSize: Math.round(width * 0.06),
      fontFamily: theme.fontHeading,
      fontStyle: 'bold',
      fill: theme.text,
      align: 'center',
      verticalAlign: 'middle',
      lineHeight: 1.2,
      name: 'Headline',
    }),
    createShapeElement({
      x: (width - ctaWidth) / 2,
      y: height * 0.6,
      width: ctaWidth,
      height: ctaHeight,
      shape: 'rect',
      fill: theme.accent,
      cornerRadius: Math.round(ctaHeight / 2),
      name: 'CTA Button',
    }),
    createTextElement({
      x: (width - ctaWidth) / 2,
      y: height * 0.6,
      width: ctaWidth,
      height: ctaHeight,
      text: cta,
      fontSize: Math.round(width * 0.03),
      fontFamily: theme.fontBody,
      fontStyle: 'bold',
      fill: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
      name: 'CTA Text',
    }),
  ];
  return { id: nanoid(10), type: 'call-to-action', name: 'CTA', elements };
}

// ─── Public Slide Builders ───────────────────────────────────────────────────

export const SlideBuilder = {
  cover: buildCoverSlide,
  'text-focused': buildTextSlide,
  'numbered-list': buildListSlide,
  quote: buildQuoteSlide,
  'call-to-action': buildCTASlide,
};

export function buildSlideFromPlan(
  type: SlideType,
  width: number,
  height: number,
  theme: Theme,
  data: {
    headline: string;
    bodyText: string;
    listItems?: string[];
    supportingText?: string;
  },
): Slide {
  switch (type) {
    case 'cover':
      return buildCoverSlide(width, height, theme, data.headline, data.bodyText);
    case 'text-focused':
    case 'text-and-image':
    case 'image-focused':
    case 'statistics':
    case 'timeline':
    case 'comparison':
    case 'step-by-step':
      return buildTextSlide(width, height, theme, data.headline, data.bodyText);
    case 'numbered-list':
      return buildListSlide(width, height, theme, data.headline, data.listItems ?? [data.bodyText]);
    case 'quote':
      return buildQuoteSlide(width, height, theme, data.headline, data.supportingText ?? data.bodyText);
    case 'call-to-action':
      return buildCTASlide(width, height, theme, data.headline, data.bodyText || 'Get Started');
    case 'custom':
    default:
      return buildTextSlide(width, height, theme, data.headline, data.bodyText);
  }
}

// ─── Project Factory ─────────────────────────────────────────────────────────

export function createBlankProject(
  name: string,
  width: number = 1080,
  height: number = 1920,
  themeKey: string = 'modern-editorial',
): Project {
  const theme = DEFAULT_THEMES[themeKey] ?? DEFAULT_THEMES['modern-editorial'];
  const cover = buildCoverSlide(width, height, theme, name, 'Swipe to learn more →');
  return {
    id: nanoid(10),
    name,
    dimensions: {
      width,
      height,
      aspectRatio: width === height ? '1:1' : width > height ? '16:9' : '9:16',
    },
    slides: [cover],
    theme,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnail: null,
  };
}

export function createProjectFromSlides(
  name: string,
  width: number,
  height: number,
  theme: Theme,
  slides: Slide[],
): Project {
  return {
    id: nanoid(10),
    name,
    dimensions: {
      width,
      height,
      aspectRatio: width === height ? '1:1' : width > height ? '16:9' : width / height === 1080 / 1350 ? '4:5' : '9:16',
    },
    slides,
    theme,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnail: null,
  };
}

// ─── Starter Templates ───────────────────────────────────────────────────────

function buildTemplate(
  id: string,
  name: string,
  description: string,
  category: string,
  themeKey: string,
  width: number,
  height: number,
  slideConfigs: Array<{ type: SlideType; data: { headline: string; bodyText: string; listItems?: string[] } }>,
): Template {
  const theme = DEFAULT_THEMES[themeKey];
  const slides = slideConfigs.map(({ type, data }) =>
    buildSlideFromPlan(type, width, height, theme, data),
  );
  return {
    id,
    name,
    description,
    category,
    dimensions: { width, height, aspectRatio: width === height ? '1:1' : width > height ? '16:9' : '9:16' },
    theme,
    slides,
    thumbnail: null,
  };
}

export const STARTER_TEMPLATES: Template[] = [
  buildTemplate(
    'tpl-minimal-bw', 'Minimal Black & White', 'Clean monochrome design with bold typography',
    'Minimal', 'minimal-bw', 1080, 1350,
    [
      { type: 'cover', data: { headline: 'Your Title Here', bodyText: 'A minimal slideshow' } },
      { type: 'text-focused', data: { headline: 'Key Point', bodyText: 'Your content goes here. Keep it clean and readable.' } },
      { type: 'call-to-action', data: { headline: 'Get Started Today', bodyText: 'Learn More' } },
    ],
  ),
  buildTemplate(
    'tpl-modern-editorial', 'Modern Editorial', 'Sophisticated editorial layout with serif headings',
    'Editorial', 'modern-editorial', 1080, 1350,
    [
      { type: 'cover', data: { headline: 'The Modern Guide', bodyText: 'Swipe to explore →' } },
      { type: 'numbered-list', data: { headline: 'Top 5 Tips', bodyText: '', listItems: ['Start with clarity', 'Keep it simple', 'Focus on value', 'Use visuals wisely', 'End with impact'] } },
      { type: 'quote', data: { headline: 'Simplicity is the ultimate sophistication.', bodyText: 'Leonardo da Vinci' } },
      { type: 'call-to-action', data: { headline: 'Ready to Begin?', bodyText: 'Start Now' } },
    ],
  ),
  buildTemplate(
    'tpl-bold-typography', 'Bold Typography', 'High-impact design with bold fonts on dark background',
    'Bold', 'bold-typography', 1080, 1920,
    [
      { type: 'cover', data: { headline: 'MAKE IT BOLD', bodyText: 'Stand out from the crowd' } },
      { type: 'text-focused', data: { headline: 'BE DIFFERENT', bodyText: 'Bold design captures attention instantly.' } },
      { type: 'call-to-action', data: { headline: 'GO BIG', bodyText: 'Try It Now' } },
    ],
  ),
  buildTemplate(
    'tpl-clean-corporate', 'Clean Corporate', 'Professional business presentation template',
    'Business', 'clean-corporate', 1920, 1080,
    [
      { type: 'cover', data: { headline: 'Q4 Strategy Overview', bodyText: 'Business Presentation 2024' } },
      { type: 'numbered-list', data: { headline: 'Key Objectives', bodyText: '', listItems: ['Increase revenue by 20%', 'Expand to new markets', 'Improve customer retention'] } },
      { type: 'call-to-action', data: { headline: 'Next Steps', bodyText: 'Schedule a Meeting' } },
    ],
  ),
  buildTemplate(
    'tpl-colorful-edu', 'Colorful Educational', 'Vibrant educational carousel perfect for learning content',
    'Educational', 'colorful-educational', 1080, 1350,
    [
      { type: 'cover', data: { headline: '5 Things to Know', bodyText: 'A quick guide →' } },
      { type: 'numbered-list', data: { headline: 'The Basics', bodyText: '', listItems: ['Start with the fundamentals', 'Practice regularly', 'Learn from mistakes', 'Ask questions', 'Teach others'] } },
      { type: 'call-to-action', data: { headline: 'Keep Learning!', bodyText: 'Follow for more' } },
    ],
  ),
  buildTemplate(
    'tpl-photo-focus', 'Photography Focus', 'Dark theme designed to showcase photography',
    'Photography', 'photography-focused', 1080, 1350,
    [
      { type: 'cover', data: { headline: 'Through the Lens', bodyText: 'A visual journey' } },
      { type: 'quote', data: { headline: 'Photography is the story I fail to put into words.', bodyText: 'Destin Sparks' } },
      { type: 'call-to-action', data: { headline: 'See More', bodyText: 'Visit Gallery' } },
    ],
  ),
  buildTemplate(
    'tpl-product-mktg', 'Product Marketing', 'Energetic template for product promotions',
    'Marketing', 'product-marketing', 1080, 1080,
    [
      { type: 'cover', data: { headline: 'Meet Your New Favorite', bodyText: 'Launching soon' } },
      { type: 'text-focused', data: { headline: 'Why You\'ll Love It', bodyText: 'Designed with you in mind. Built for everyday use.' } },
      { type: 'call-to-action', data: { headline: 'Get Early Access', bodyText: 'Sign Up Now' } },
    ],
  ),
  buildTemplate(
    'tpl-minimal-illus', 'Minimalist Illustration', 'Soft colors and clean lines for illustration-focused content',
    'Illustration', 'minimalist-illustration', 1080, 1350,
    [
      { type: 'cover', data: { headline: 'Simple Ideas', bodyText: 'Illustrated for clarity' } },
      { type: 'text-focused', data: { headline: 'Less is More', bodyText: 'Clean design helps your message shine through.' } },
      { type: 'call-to-action', data: { headline: 'Explore More', bodyText: 'Visit Website' } },
    ],
  ),
];
