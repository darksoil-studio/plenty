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
  retryIntervalMs: number
): Promise<T> {
  let numRetries = 0;
  while (true) {
    try {
      const result = await task();
      return result;
    } catch (e) {
      console.warn(
        `Failed task with error: ${e}. Retrying in ${retryIntervalMs}ms`
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
  file: File
): Promise<Array<Omit<Product, "producer_hash">>> {
  const contents = await readAsText(file);
  if (contents.length === 0) throw new Error(msg("File is empty"));

  const lines = contents.split("\n");

  if (lines.length === 0) throw new Error(msg("File only has one line"));

  const firstLine = lines.slice(0, 1)[0];
  const headers = firstLine.split(",");

  const nameIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("name")
  );
  if (nameIndex === -1) throw new Error(msg('There is no "name" column'));

  const productIdIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("product id")
  );
  if (productIdIndex === -1)
    throw new Error(msg('There is no "Product ID" column'));

  const priceIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("price")
  );
  if (priceIndex === -1) throw new Error(msg('There is no "Price" column'));

  const vatIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("VAT")
  );
  if (vatIndex === -1) throw new Error(msg('There is no "VAT" column'));

  const descriptionIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("description")
  );

  const categoriesIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("categor")
  );

  const packagingIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("packaging")
  );
  const marginPercentageIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("margin")
  );
  const originIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("ingredients")
  );
  const ingredientsIndex = headers.findIndex((header) =>
    header.toLocaleLowerCase().includes("ingredients")
  );

  const productLines = lines.slice(1);

  const products: Array<Omit<Product, "producer_hash">> = productLines.map(
    (productLine, i) => {
      const fields = productLine.split(",");
      if (fields.length !== headers.length)
        throw new Error(
          msg(
            str`Line number ${
              i + 1
            } does not have the correct number of columns: there are ${
              headers.length
            } columns in the file and this line has ${fields.length} columns`
          )
        );

      const name = fields[nameIndex];
      const product_id = fields[productIdIndex];
      const price = parseFloat(fields[priceIndex]);
      if (isNaN(price))
        throw new Error(
          msg(str`Unrecognized price field: ${fields[priceIndex]}`)
        );
      const vat_percentage = parseFloat(fields[vatIndex]);
      if (isNaN(vat_percentage))
        throw new Error(msg(str`Unrecognized VAT field: ${fields[vatIndex]}`));

      const packagingStr = fields[packagingIndex];
      const packaging = parsePackagingField(packagingStr);

      const description =
        descriptionIndex === -1 ? "" : fields[descriptionIndex];
      const categories =
        categoriesIndex === -1 ? [] : fields[categoriesIndex].split("|");
      const margin_percentage =
        marginPercentageIndex === -1
          ? undefined
          : parseFloat(fields[marginPercentageIndex]);
      if (margin_percentage && isNaN(margin_percentage))
        throw new Error(
          msg(str`Unrecognized margin field: ${fields[marginPercentageIndex]}`)
        );
      const origin = originIndex === -1 ? undefined : fields[originIndex];
      const ingredients =
        ingredientsIndex === -1 ? undefined : fields[ingredientsIndex];

      return {
        name,
        description,
        categories,
        product_id,
        price,
        vat_percentage,
        margin_percentage,
        origin,
        ingredients,
        packaging,
        maximum_available: undefined,
      };
    }
  );

  return products;
}

export function parsePackagingField(packagingStr: string): Packaging {
  if (packagingStr.includes("x")) {
    const split = packagingStr.split("x");
    if (split.length > 2)
      throw new Error(
        msg(
          str`Unrecognized packaging field (more than one 'x' characters found): ${packagingStr}`
        )
      );
    const number_of_packages = parseInt(split[0]);

    if (isNaN(number_of_packages))
      throw new Error(msg(str`Unrecognized packaging field: ${packagingStr}`));

    const [unit, amount_per_package] =
      parsePackagingWithoutNumberOfPackages(packagingStr);

    return {
      number_of_packages,
      unit,
      amount_per_package,
      estimate: false,
    };
  } else {
    const number_of_packages = 1;
    const [unit, amount_per_package] =
      parsePackagingWithoutNumberOfPackages(packagingStr);

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
  packagingStr: string
): [PackagingUnit, number] {
  const matches = packagingStr.match(/([\d,.])+(.)+/g);

  if (!matches)
    throw new Error(msg(str`Unrecognized packaging field: ${packagingStr}`));

  const numberStr = matches[1];
  const amount_per_package = parseFloat(numberStr);
  if (isNaN(amount_per_package))
    throw new Error(msg(str`Unrecognized packaging field: ${packagingStr}`));

  const unit = parseUnit(matches[2]);
  return [unit, amount_per_package];
}

function parseUnit(unitStr: string): PackagingUnit {
  switch (unitStr.toLowerCase()) {
    case "kilograms":
    case "kg":
      return "Kilograms";
    case "grams":
    case "g":
      return "Grams";
    case "liters":
    case "l":
      return "Liters";
    case "ml":
    case "milliliters":
      return "Milliliters";
    case "ounces":
      return "Ounces";
    case "pounds":
      return "Pounds";
    case "piece":
    case "pieces":
      return "Piece";
    default:
      throw new Error(msg(str`Unrecognized packaging unit: ${unitStr}`));
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
