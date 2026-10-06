/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Allow the style prop only as an object literal of CSS custom properties (CODE_STYLE §5a)",
    },
    schema: [],
    messages: {
      notObjectLiteral:
        'Pass style as an inline object literal of CSS custom properties, such as the "--swatch-color" property. Put styling in the component\'s .css file.',
      notCustomProperty:
        'Only CSS custom properties ("--name") are allowed in style. Put styling in the component\'s .css file.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "style") return;

        const expression =
          node.value?.type === "JSXExpressionContainer" ? node.value.expression : null;
        if (expression?.type !== "ObjectExpression") {
          context.report({ node, messageId: "notObjectLiteral" });
          return;
        }

        for (const property of expression.properties) {
          const isCustomProperty =
            property.type === "Property" &&
            !property.computed &&
            property.key.type === "Literal" &&
            typeof property.key.value === "string" &&
            property.key.value.startsWith("--");
          if (!isCustomProperty) {
            context.report({ node: property, messageId: "notCustomProperty" });
          }
        }
      },
    };
  },
};
