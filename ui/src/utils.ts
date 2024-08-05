import { msg, str } from "@lit/localize";
import {
  Packaging,
  PackagingUnit,
  Producer,
  Product,
} from "./plenty/producers/types";

export async function tryAndRetry<T>(
  task: () => Promise<T>,
  maxRetries: number,
  retryIntervalMs: number,
): Promise<T> {
  let numRetries = 0;
  while (true) {
    try {
      const result = await task();
      return result;
    } catch (e) {
      console.warn(
        `Failed task with error: ${e}. Retrying in ${retryIntervalMs}ms`,
      );
      if (numRetries < maxRetries) {
        throw e;
      }
      await sleep(retryIntervalMs);
    }
  }
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(() => resolve(undefined), ms));

export async function processCsvProductsFile(
  file: File,
): Promise<Array<Omit<Product, "producer_hash">>> {
  const contents = await readAsText(file);
  if (contents.length === 0) throw new Error(msg("File is empty"));

  const lines = csvStringToArray(contents.trim());

  if (lines.length === 0) throw new Error(msg("File only has one line"));

  const headers = lines.slice(0, 1)[0];

  const nameIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("name"),
  );
  if (nameIndex === -1) throw new Error(msg('There is no "name" column'));

  const productIdIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("product id"),
  );
  if (productIdIndex === -1)
    throw new Error(msg('There is no "Product ID" column'));

  const priceIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("price"),
  );
  if (priceIndex === -1) throw new Error(msg('There is no "Price" column'));

  const vatIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("vat"),
  );
  if (vatIndex === -1) throw new Error(msg('There is no "VAT" column'));
  if (
    headers.filter((header) => header.toLocaleLowerCase().includes("vat"))
      .length > 1
  )
    throw new Error(msg(`Multiple columns contain "VAT" in their header`));

  const descriptionIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("description"),
  );

  const categoriesIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("categor"),
  );

  const packagingIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("packaging"),
  );
  const marginPercentageIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("margin"),
  );
  const originIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("ingredients"),
  );
  const ingredientsIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("ingredients"),
  );
  const multiplierIndex = headers.findIndex(
    (header) => header.toLocaleLowerCase() === "x",
  );

  const productLines = lines.slice(1);

  const products: Array<Omit<Product, "producer_hash">> = productLines.map(
    (fields, i) => {
      if (fields.length !== headers.length)
        throw new Error(
          msg(
            str`Line number ${
              i + 1
            } does not have the correct number of columns: there are ${
              headers.length
            } columns in the file and this line has ${fields.length} columns`,
          ),
        );

      const name = fields[nameIndex];
      const product_id = fields[productIdIndex];

      const priceMatches = fields[priceIndex].match(/([\d\,\.]+)/g);
      if (!priceMatches)
        throw new Error(
          msg(str`Unrecognized price field: ${fields[priceIndex]}`),
        );
      let price = parseFloat(priceMatches[0].replace(",", "."));
      if (isNaN(price))
        throw new Error(
          msg(str`Unrecognized price field: ${fields[priceIndex]}`),
        );

      if (multiplierIndex !== -1) {
        const multiplier = parseFloat(fields[multiplierIndex]);
        if (isNaN(multiplier))
          throw new Error(
            msg(str`Unrecognized multiplier field: ${fields[multiplierIndex]}`),
          );
        price = multiplier * price;
      }

      const vat = fields[vatIndex].split("%")[0];
      const vat_percentage = parseFloat(vat.replace(",", "."));
      if (isNaN(vat_percentage))
        throw new Error(msg(str`Unrecognized VAT field: ${fields[vatIndex]}`));

      const packagingStr = fields[packagingIndex];
      const packaging = parsePackagingField(packagingStr, i + 1);

      const description =
        descriptionIndex === -1 ? "" : fields[descriptionIndex];
      const categories =
        categoriesIndex === -1 ? [] : fields[categoriesIndex].split(",");
      const margin_percentage =
        marginPercentageIndex === -1
          ? undefined
          : parseFloat(
              fields[marginPercentageIndex].split("%")[0].replace(",", "."),
            );
      if (margin_percentage && isNaN(margin_percentage))
        throw new Error(
          msg(str`Unrecognized margin field: ${fields[marginPercentageIndex]}`),
        );
      const origin = originIndex === -1 ? undefined : fields[originIndex];
      const ingredients =
        ingredientsIndex === -1 ? undefined : fields[ingredientsIndex];

      return {
        name,
        description,
        categories,
        product_id,
        price_cents: Math.round(price * 100),
        vat_percentage,
        margin_percentage,
        origin,
        ingredients,
        packaging,
        maximum_available: undefined,
      };
    },
  );

  return products;
}

const csvStringToArray = (data: string) => {
  const re = /(,|\r?\n|\r|^)(?:"([^"]*(?:""[^"]*)*)"|([^,\r\n]*))/gi;
  const result: string[][] = [[]];
  let matches;
  while ((matches = re.exec(data))) {
    if (matches[1].length && matches[1] !== ",") result.push([]);
    result[result.length - 1].push(
      matches[2] !== undefined ? matches[2].replace(/""/g, '"') : matches[3],
    );
  }
  return result;
};

export function parsePackagingField(
  packagingStr: string,
  lineNumber: number,
): Packaging {
  if (packagingStr.includes("x")) {
    const split = packagingStr.split("x").map((s) => s.trim());
    if (split.length > 2)
      throw new Error(
        msg(
          str`Unrecognized packaging field (more than one 'x' characters found) "${packagingStr}" in line number ${lineNumber}`,
        ),
      );

    const isNumberOfPackagesFirst = split[0].match(/^[\d]+$/);

    const numberOfPackagesIndex = isNumberOfPackagesFirst ? 0 : 1;
    const amountPerPackageIndex = isNumberOfPackagesFirst ? 1 : 0;

    const number_of_packages = parseInt(split[numberOfPackagesIndex]);

    if (isNaN(number_of_packages))
      throw new Error(
        msg(
          str`Unrecognized packaging field "${packagingStr}" in line number ${lineNumber}`,
        ),
      );

    const [unit, amount_per_package] = parsePackagingWithoutNumberOfPackages(
      split[amountPerPackageIndex],
      lineNumber,
    );

    return {
      number_of_packages,
      unit,
      amount_per_package,
      estimate: false,
    };
  } else {
    const number_of_packages = 1;
    const [unit, amount_per_package] = parsePackagingWithoutNumberOfPackages(
      packagingStr,
      lineNumber,
    );

    return {
      number_of_packages,
      unit,
      amount_per_package,
      estimate: false,
    };
  }
}

// Possible Inputs:
// - 500ml
// - 0.5g
// - 0,5g
// - 5kg
// - 5liters
function parsePackagingWithoutNumberOfPackages(
  packagingStr: string,
  lineNumber: number,
): [PackagingUnit, number] {
  const matches = [...packagingStr.matchAll(/([\d\,\.]+)\s*(.+)$/g)];

  if (matches.length === 0)
    throw new Error(
      msg(
        str`Unrecognized packaging field "${packagingStr}" in line number ${lineNumber}`,
      ),
    );

  const numberStr = matches[0][1];
  const amount_per_package = parseFloat(numberStr);
  if (isNaN(amount_per_package))
    throw new Error(
      msg(
        str`Unrecognized packaging field "${packagingStr}" in line number ${lineNumber}`,
      ),
    );

  const unit = parseUnit(matches[0][2], lineNumber);
  return [unit, amount_per_package];
}

function parseUnit(unitStr: string, lineNumber: number): PackagingUnit {
  switch (unitStr.toLowerCase()) {
    case "kilograms":
    case "kilogram":
    case "kg":
      return "Kilograms";
    case "grams":
    case "g":
    case "gr":
      return "Grams";
    case "liters":
    case "liter":
    case "l":
      return "Liters";
    case "ml":
    case "milliliters":
    case "milliliter":
      return "Milliliters";
    case "ounces":
    case "ounce":
    case "oz":
      return "Ounces";
    case "pounds":
    case "pound":
    case "lb":
      return "Pounds";
    case "st":
    case "piece":
    case "pcs":
    case "p":
    case "pieces":
      return "Piece";
    default:
      throw new Error(
        msg(
          str`Unrecognized packaging unit "${unitStr}" in line number ${lineNumber} `,
        ),
      );
  }
}

export async function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      if (!loadEvent.target) return;
      if (loadEvent.target.readyState != 2) {
        return;
      } else if (loadEvent.target.error) {
        reject(loadEvent.target.error);
      } else {
        resolve(loadEvent.target.result as string);
      }
    };

    reader.readAsText(file);
  });
}
