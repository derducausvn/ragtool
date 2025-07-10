"""
excel_to_pdf_converter.py
-------------------------
Converts Excel files to PDF format for knowledge base upload.
Handles filled questionnaires and other Excel documents.
"""

import os
import pandas as pd
from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
import logging
from typing import Optional
import tempfile


def excel_to_pdf(excel_path: str, pdf_path: Optional[str] = None) -> str:
    """
    Convert Excel file to PDF format.
    
    Args:
        excel_path: Path to the Excel file
        pdf_path: Output PDF path (optional, auto-generated if not provided)
    
    Returns:
        Path to the generated PDF file
    
    Raises:
        Exception: If conversion fails
    """
    try:
        # Generate PDF path if not provided
        if pdf_path is None:
            base_name = os.path.splitext(os.path.basename(excel_path))[0]
            pdf_path = os.path.join(os.path.dirname(excel_path), f"{base_name}.pdf")
        
        # Read Excel file with all sheets
        excel_file = pd.ExcelFile(excel_path)
        
        # Create PDF document
        doc = SimpleDocTemplate(
            pdf_path, 
            pagesize=A4,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
        )
        
        # Build content
        story = []
        styles = getSampleStyleSheet()
        
        # Title style
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Add document title
        filename = os.path.basename(excel_path)
        story.append(Paragraph(f"Document: {filename}", title_style))
        story.append(Spacer(1, 20))
        
        # Process each sheet
        for sheet_name in excel_file.sheet_names:
            try:
                df = pd.read_excel(excel_path, sheet_name=sheet_name)
                
                if df.empty:
                    continue
                
                # Add sheet title if multiple sheets
                if len(excel_file.sheet_names) > 1:
                    sheet_title = Paragraph(f"Sheet: {sheet_name}", styles['Heading2'])
                    story.append(sheet_title)
                    story.append(Spacer(1, 12))
                
                # Clean the dataframe
                df = df.fillna('')  # Replace NaN with empty string
                
                # Convert to string to handle mixed data types
                df = df.astype(str)
                
                # Prepare table data
                table_data = []
                
                # Add headers if they exist
                if not df.columns.empty:
                    headers = [str(col) for col in df.columns]
                    table_data.append(headers)
                
                # Add data rows
                for _, row in df.iterrows():
                    table_data.append([str(cell) for cell in row])
                
                if table_data:
                    # Create table
                    table = Table(table_data)
                    
                    # Style the table
                    table_style = [
                        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 8),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('WORDWRAP', (0, 0), (-1, -1), True),
                    ]
                    
                    table.setStyle(TableStyle(table_style))
                    
                    # Auto-size columns to fit page
                    available_width = A4[0] - 2 * 0.5 * inch
                    col_count = len(table_data[0]) if table_data else 1
                    col_width = available_width / col_count
                    
                    # Set column widths
                    table._argW = [col_width] * col_count
                    
                    story.append(table)
                    story.append(Spacer(1, 20))
                    
            except Exception as e:
                logging.warning(f"Failed to process sheet '{sheet_name}': {e}")
                # Add error note
                error_para = Paragraph(f"Error processing sheet '{sheet_name}': {str(e)}", styles['Normal'])
                story.append(error_para)
                story.append(Spacer(1, 12))
        
        # Build PDF
        doc.build(story)
        
        logging.info(f"Successfully converted {excel_path} to {pdf_path}")
        return pdf_path
        
    except Exception as e:
        logging.error(f"Failed to convert Excel to PDF: {e}")
        raise


def convert_excel_for_knowledge_base(excel_path: str, temp_dir: Optional[str] = None) -> str:
    """
    Convert Excel file to PDF specifically for knowledge base upload.
    Creates a temporary PDF file that can be uploaded and then cleaned up.
    
    Args:
        excel_path: Path to the Excel file
        temp_dir: Directory for temporary files (optional)
    
    Returns:
        Path to the temporary PDF file
    """
    try:
        # Create temporary PDF file
        if temp_dir is None:
            temp_dir = tempfile.gettempdir()
        
        base_name = os.path.splitext(os.path.basename(excel_path))[0]
        pdf_path = os.path.join(temp_dir, f"{base_name}_converted.pdf")
        
        # Convert to PDF
        return excel_to_pdf(excel_path, pdf_path)
        
    except Exception as e:
        logging.error(f"Failed to convert Excel for knowledge base: {e}")
        raise


def batch_convert_excel_files(excel_files: list, output_dir: str) -> list:
    """
    Convert multiple Excel files to PDF format.
    
    Args:
        excel_files: List of Excel file paths
        output_dir: Directory to save PDF files
    
    Returns:
        List of converted PDF file paths
    """
    converted_files = []
    
    for excel_file in excel_files:
        try:
            base_name = os.path.splitext(os.path.basename(excel_file))[0]
            pdf_path = os.path.join(output_dir, f"{base_name}.pdf")
            
            converted_pdf = excel_to_pdf(excel_file, pdf_path)
            converted_files.append(converted_pdf)
            
        except Exception as e:
            logging.error(f"Failed to convert {excel_file}: {e}")
    
    return converted_files


def is_excel_file(file_path: str) -> bool:
    """Check if file is an Excel file based on extension."""
    excel_extensions = {'.xlsx', '.xls', '.xlsm', '.xlsb'}
    return os.path.splitext(file_path.lower())[1] in excel_extensions
