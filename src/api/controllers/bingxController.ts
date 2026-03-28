import { Request, Response } from 'express';
import { BingXDataService } from '../../infrastructure/bingx/BingXDataService';

let dataService: BingXDataService;

export const getContracts = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!dataService) {
            dataService = await BingXDataService.create();
        }
        const contracts = await dataService.getContracts();
        res.json({ success: true, data: contracts });
    } catch (error) {
        console.error('Error fetching BingX contracts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch BingX contracts' });
    }
};
