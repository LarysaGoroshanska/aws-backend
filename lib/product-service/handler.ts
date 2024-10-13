import { products } from './constants';

type Event = {
    message: string;
    pathParameters: {
      productId?: string;
    };
};

export async function main(event: Event) {
  if (event.pathParameters.productId) {
    const product = products.find((product) => product.id === event.pathParameters.productId);

    return {
      data: { product },
    };
  } else {
    return {
      data: { products },
    };
  }
}