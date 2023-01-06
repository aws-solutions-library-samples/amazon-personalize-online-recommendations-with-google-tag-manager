// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from 'react';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';

import {
  Select,
  Multiselect,
  Button,
  MultiselectProps,
  NonCancelableCustomEvent,
  Alert,
  SelectProps,
} from '@cloudscape-design/components';
import TagManager from 'react-gtm-module';

interface Option {
  label?: string;
  value?: string;
}

interface ProductRecommendation {
  itemId: string;
  score: number;
  label: string;
}

interface ProductRecommendations {
  recommendations: ProductRecommendation[];
  rtt: number;
}

declare global {
  interface Window {
    setCrossSellRecommendations: React.Dispatch<
      React.SetStateAction<ProductRecommendations | undefined>
    >;
  }
}

const users = [
  {
    label: 'Alejandro Rosalez',
    value: '4353',
  },
  {
    label: 'John Stiles',
    value: '1588',
  },
  {
    label: 'Martha Rivera',
    value: '1525',
  },
] as Option[];

const products = [
  { value: '9b60b9e7-d6ec-4401-a773-7d037f858418', label: 'Black Jacket' },
  { value: 'd75b932b-0593-4cbe-b61d-a9b2dbd16e51', label: 'Fashionable Scarf' },
  { value: '26744e55-7e27-4192-be27-af96c812fd3e', label: 'Massage Oil' },
  { value: '4bcb9dea-5dc0-41b4-b086-382ea577ac96', label: 'Camera' },
  { value: '5cdf4255-a8a5-43d8-a996-0540dfcdd702', label: 'Television' },
  { value: '81518e3d-c5ef-4217-9d76-f334cae5466b', label: 'Crimson Sneakers' },
] as Option[];

const pages = [
  { label: 'Backpack Page', value: '6579c22f-be2b-444c-a52b-0116dd82df6c' },
  { label: 'Glasses Page', value: 'b9eef17f-2ee0-4a08-b22f-2c2cd24e04d7' },
  { label: 'Handbag Page', value: '9943c887-d454-420d-a39b-b4a81e2980b7' },
] as Option[];

export default function App() {
  const [selectedUser, setUser] = useState(users[0]);
  const [selectedProducts, setProducts] = useState<readonly Option[]>([]);
  const [crossSellRecommendations, setCrossSellRecommendations] =
    useState<ProductRecommendations>();
  window.setCrossSellRecommendations = setCrossSellRecommendations;

  const handleUserSelection = ({
    detail: { selectedOption },
  }: NonCancelableCustomEvent<SelectProps.ChangeDetail>) => {
    setUser(selectedOption);
    TagManager.dataLayer({
      dataLayer: {
        user: selectedOption.value,
      },
    });
    if (selectedProducts && selectedProducts.length > 0) {
      TagManager.dataLayer({
        dataLayer: {
          event: 'update-cart',
          products: selectedProducts.map((option) => option.value).join(','),
        },
      });
    }
  };

  useEffect(() => {
    TagManager.dataLayer({
      dataLayer: {
        user: selectedUser.value,
      },
    });
  }, [selectedUser.value]);

  const handleProductSelection = ({
    detail: { selectedOptions },
  }: NonCancelableCustomEvent<MultiselectProps.MultiselectChangeDetail>) => {
    setProducts(selectedOptions);
    if (selectedOptions.length > 0) {
      TagManager.dataLayer({
        dataLayer: {
          event: 'update-cart',
          user: selectedUser.value,
          products: selectedOptions.map((option) => option.value).join(','),
        },
      });
    } else {
      setCrossSellRecommendations(undefined);
    }
  };

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="This website demonstrates real-time recommendations from Amazon Personalize"
      >
        Amazon Personalize Demo
      </Header>
      <Container
        header={
          <Header variant="h2" description="Select a User for this demo">
            User
          </Header>
        }
      >
        <Select
          selectedOption={selectedUser}
          options={users}
          onChange={handleUserSelection}
        />
      </Container>
      <Container
        header={
          <Header
            variant="h2"
            description="Send some page visit events to Amazon Personalize"
          >
            Click Stream
          </Header>
        }
      >
        <SpaceBetween size="s">
          <span>
            Select a Product/Item page to send a page visit event to Amazon
            Personalize
          </span>
          <SpaceBetween size="s" direction="horizontal">
            {pages.map((page) => (
              <Button
                key={page.value}
                onClick={() =>
                  window.history.pushState(
                    undefined,
                    `Amazon Personalize Demo - ${page.label}`,
                    `/product/${page.value}`
                  )
                }
              >
                {page.label}
              </Button>
            ))}
          </SpaceBetween>
        </SpaceBetween>
      </Container>
      <Container
        header={
          <Header
            variant="h2"
            description="Add/remove products to/from shopping cart"
          >
            Shopping Cart
          </Header>
        }
      >
        <SpaceBetween size="s">
          <Multiselect
            selectedOptions={selectedProducts}
            options={products}
            onChange={handleProductSelection}
            keepOpen={false}
          />
          <Alert
            visible={!!crossSellRecommendations}
            header="Sponsored items"
            type="success"
          >
            <SpaceBetween size="s" direction="horizontal">
              {uniqueRecommendations(
                selectedProducts,
                crossSellRecommendations?.recommendations
              )
                ?.slice(0, 1)
                .map((product) => (
                  <Button
                    onClick={() => {
                      window.history.pushState(
                        undefined,
                        `Amazon Personalize Demo - ${product.label}`,
                        `/product/${product.itemId}`
                      );
                    }}
                    key={product.itemId}
                  >
                    {product.label}
                  </Button>
                ))}
            </SpaceBetween>
          </Alert>
          <Alert
            visible={!!crossSellRecommendations}
            header="Recommendations for you based on items in your cart"
          >
            <SpaceBetween size="s" direction="horizontal">
              {uniqueRecommendations(
                selectedProducts,
                crossSellRecommendations?.recommendations
              )
                ?.slice(1)
                .map((product) => (
                  <Button
                    onClick={() => {
                      window.history.pushState(
                        undefined,
                        `Amazon Personalize Demo - ${product.label}`,
                        `/product/${product.itemId}`
                      );
                    }}
                    key={product.itemId}
                  >
                    {product.label}
                  </Button>
                ))}
            </SpaceBetween>
            {crossSellRecommendations && (
              <i>
                Recommendations received in {crossSellRecommendations?.rtt}ms
              </i>
            )}
          </Alert>
        </SpaceBetween>
      </Container>
    </SpaceBetween>
  );
}

const uniqueRecommendations = (
  selectedProducts: readonly Option[],
  recommendations?: ProductRecommendation[]
) => {
  const labels = new Set<string>(
    selectedProducts.map((product) => product.label!)
  );
  return recommendations?.reduce((recommendations, recommendation) => {
    if (!labels.has(recommendation.label)) {
      recommendations.push(recommendation);
      labels.add(recommendation.label);
    }
    return recommendations;
  }, [] as ProductRecommendation[]);
};
